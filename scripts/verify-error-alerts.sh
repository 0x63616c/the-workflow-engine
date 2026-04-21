#!/bin/bash
# End-to-end verification for the Grafana Loki -> Slack -> #errors pipeline.
# Run after deploying the alerting config. Exits non-zero on any failed step.
#
# Steps:
#   1. Grafana loaded alerting provisioning without errors
#   2. Slack webhook URL is reachable (curl directly from local machine)
#   3. Loki accepts the alert-rule query and returns a sane shape
#   4. Inject a fake pino error into the API container, wait for the alert,
#      then check #errors via the Slack API for the expected message

set -euo pipefail

HOMELAB_HOST="homelab"
GRAFANA_CONTAINER="workflow-engine-grafana"
ALLOY_SOURCE_CONTAINER_PREFIX="workflow-engine-web"
LOKI_URL="http://${HOMELAB_HOST}:3100"
ERRORS_CHANNEL_ID="C0AV61FPQ8G"
ALERT_EVAL_WAIT_SECONDS=75
TEST_MARKER="verify-error-alerts-$(date +%s)"

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() {
  printf "  \033[31m✗\033[0m %s\n" "$1" >&2
  exit 1
}
step() { printf "\n\033[1m[%s]\033[0m %s\n" "$1" "$2"; }

# ---------- Step 1: Grafana provisioning ----------
step "1/4" "Grafana provisioning loaded without errors"

# shellcheck disable=SC2029  # client-side expansion of $GRAFANA_CONTAINER is intentional
grafana_log=$(ssh "$HOMELAB_HOST" "docker logs $GRAFANA_CONTAINER 2>&1 | grep -iE 'provisioning|alerting' | tail -30" || true)
if [ -z "$grafana_log" ]; then
  fail "no provisioning/alerting lines in $GRAFANA_CONTAINER logs — did the container boot?"
fi

if echo "$grafana_log" | grep -qiE 'fail|error.*(contact|policy|rule)'; then
  echo "$grafana_log" | grep -iE 'fail|error'
  fail "provisioning errors in $GRAFANA_CONTAINER logs (see above)"
fi

pass "alerting provisioning loaded"

# ---------- Step 2: Webhook reachable ----------
step "2/4" "Slack webhook URL delivers (bypasses Grafana)"

webhook=$(op read "op://Homelab/Grafana Errors Slack Webhook/credential")
if [ -z "$webhook" ]; then
  fail "couldn't read op://Homelab/Grafana Errors Slack Webhook/credential"
fi

http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-type: application/json" \
  --data "{\"text\":\":white_check_mark: verify-error-alerts.sh reached the webhook at $(date -u +%FT%TZ)\"}" \
  "$webhook")

if [ "$http_code" != "200" ]; then
  fail "webhook POST returned HTTP $http_code (expected 200) — bad URL or revoked"
fi

pass "Slack accepted the webhook POST (check #errors for the ✅ message)"

# ---------- Step 3: Loki query shape ----------
step "3/4" "Loki accepts the alert-rule query"

query='sum by (container) (count_over_time({container=~".+"} | json | level=~"50|60" [5m]))'
loki_response=$(curl -fsS --get "$LOKI_URL/loki/api/v1/query" --data-urlencode "query=$query")
status=$(echo "$loki_response" | jq -r '.status')

if [ "$status" != "success" ]; then
  echo "$loki_response" | jq .
  fail "Loki rejected the backend-errors query"
fi

pass "query is valid logql; Loki returned status=success"

# ---------- Step 4: End-to-end round-trip ----------
step "4/4" "Inject fake error -> Alloy -> Loki -> Grafana -> Slack"

# shellcheck disable=SC2029  # client-side expansion of $ALLOY_SOURCE_CONTAINER_PREFIX is intentional
api_container=$(ssh "$HOMELAB_HOST" "docker ps --format '{{.Names}}' | grep '^${ALLOY_SOURCE_CONTAINER_PREFIX}-' | head -1" || true)
if [ -z "$api_container" ]; then
  fail "no running container matching '${ALLOY_SOURCE_CONTAINER_PREFIX}-*' on $HOMELAB_HOST"
fi

fake_log="{\"level\":50,\"time\":$(date +%s000),\"msg\":\"$TEST_MARKER\"}"
# shellcheck disable=SC2029  # client-side expansion of $api_container and $fake_log is intentional
ssh "$HOMELAB_HOST" "docker exec $api_container sh -c 'echo $(printf '%q' "$fake_log") > /proc/1/fd/2'"

printf "  injected test error into %s — waiting %ds for alert eval + Slack delivery...\n" \
  "$api_container" "$ALERT_EVAL_WAIT_SECONDS"

for i in $(seq 1 "$ALERT_EVAL_WAIT_SECONDS"); do
  sleep 1
  if [ $((i % 15)) -eq 0 ]; then
    printf "    ...%ds\n" "$i"
  fi
done

slack_token=$(op read "op://Homelab/Slack Bot (Evee)/slack_bot_token")
slack_response=$(curl -fsS -H "Authorization: Bearer $slack_token" \
  --get "https://slack.com/api/conversations.history" \
  --data-urlencode "channel=$ERRORS_CHANNEL_ID" \
  --data-urlencode "limit=20")

if echo "$slack_response" | jq -e --arg marker "$TEST_MARKER" \
  '[.messages[] | (.text + (.blocks // [] | tostring))] | any(test($marker))' >/dev/null; then
  pass "round-trip confirmed: injected error landed in #errors ($ERRORS_CHANNEL_ID)"
else
  echo "  no message containing marker '$TEST_MARKER' in the last 20 #errors messages"
  echo "  inspect manually:"
  echo "    - $LOKI_URL via Grafana Explore, query: {container=\"$api_container\"} | json | msg=\"$TEST_MARKER\""
  echo "    - http://$HOMELAB_HOST:3000/alerting/list (rule firing?)"
  echo "    - docker logs $GRAFANA_CONTAINER | grep -i alert"
  fail "round-trip did not complete within ${ALERT_EVAL_WAIT_SECONDS}s"
fi

echo ""
echo "All checks passed."
