#!/bin/bash
# Save Evee's secrets to 1Password and GitHub.
# Only asks for actual secrets. Non-secret config lives in infra/evee/config.yml.

set -euo pipefail

echo "=== Evee Slack Credentials ==="
echo ""

echo "Slack > Evee > OAuth & Permissions > Bot User OAuth Token (xoxb-...):"
read -s SLACK_BOT_TOKEN
echo ""
if [ -z "$SLACK_BOT_TOKEN" ]; then echo "Empty. Aborting."; exit 1; fi

echo "Slack > Evee > OAuth & Permissions > User OAuth Token (xoxp-...):"
read -s SLACK_USER_TOKEN
echo ""
if [ -z "$SLACK_USER_TOKEN" ]; then echo "Empty. Aborting."; exit 1; fi

echo "Slack > Evee > Basic Information > App Credentials > Client Secret:"
read -s SLACK_CLIENT_SECRET
echo ""
if [ -z "$SLACK_CLIENT_SECRET" ]; then echo "Empty. Aborting."; exit 1; fi

echo "Slack > Evee > Basic Information > App Credentials > Signing Secret:"
read -s SLACK_SIGNING_SECRET
echo ""
if [ -z "$SLACK_SIGNING_SECRET" ]; then echo "Empty. Aborting."; exit 1; fi

echo "Saving to 1Password..."
op item create \
  --vault Homelab \
  --category "API Credential" \
  --title "Slack Bot (Evee)" \
  "slack_bot_token=$SLACK_BOT_TOKEN" \
  "slack_user_token=$SLACK_USER_TOKEN" \
  "slack_client_secret=$SLACK_CLIENT_SECRET" \
  "slack_signing_secret=$SLACK_SIGNING_SECRET" > /dev/null

echo "Saving tokens to GitHub..."
echo "$SLACK_BOT_TOKEN" | gh secret set SLACK_BOT_TOKEN --repo 0x63616c/the-workflow-engine
echo "$SLACK_USER_TOKEN" | gh secret set SLACK_USER_TOKEN --repo 0x63616c/the-workflow-engine

echo ""
echo "Done."
