#!/bin/bash
# Save Grafana's Slack incoming webhook URL (the one that posts into #errors)
# to 1Password and GitHub secrets. Generate the webhook from the Evee app:
# api.slack.com/apps -> Evee -> Features -> Incoming Webhooks -> Add New.

set -euo pipefail

echo "Paste the Slack incoming webhook URL (https://hooks.slack.com/services/...):"
read -rs WEBHOOK_URL
echo ""

if [ -z "$WEBHOOK_URL" ]; then
  echo "No URL entered. Aborting."
  exit 1
fi

case "$WEBHOOK_URL" in
  https://hooks.slack.com/services/*) ;;
  *)
    echo "That doesn't look like a Slack webhook URL (expected https://hooks.slack.com/services/...)."
    echo "Aborting."
    exit 1
    ;;
esac

echo "Saving to 1Password (Homelab vault)..."
op item create \
  --vault Homelab \
  --category "API Credential" \
  --title "Grafana Errors Slack Webhook" \
  "credential=$WEBHOOK_URL" \
  "notesPlain=Incoming webhook for Grafana alerting -> #errors (C0AV61FPQ8G). Created on the Evee Slack app."

echo ""
echo "Saving to GitHub repo secrets..."
echo "$WEBHOOK_URL" | gh secret set GRAFANA_ERRORS_SLACK_WEBHOOK_URL --repo 0x63616c/evee

echo ""
echo "Done. Webhook URL saved to:"
echo "  - op://Homelab/Grafana Errors Slack Webhook/credential"
echo "  - GitHub secret: GRAFANA_ERRORS_SLACK_WEBHOOK_URL"
