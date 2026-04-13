#!/bin/bash
# Sync Evee's Slack app manifest from infra/evee/slack-manifest.yml to Slack API.
# Pass access token as argument or paste when prompted.
# Get token: api.slack.com/apps → Your App Configuration Tokens → Generate Token

set -euo pipefail

VAULT="Homelab"
ITEM="Slack Bot (Evee)"
MANIFEST_PATH="$(git rev-parse --show-toplevel)/infra/evee/slack-manifest.yml"
SLACK_API="https://slack.com/api"

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Manifest not found: $MANIFEST_PATH"
  exit 1
fi

# Get access token from arg or prompt
ACCESS_TOKEN="${1:-}"
if [ -z "$ACCESS_TOKEN" ]; then
  echo "Paste Configuration Access Token (xoxe.xoxp-...):"
  read -rs ACCESS_TOKEN
  echo ""
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo "No token provided. Aborting."
  exit 1
fi

# Read app ID from 1Password
echo "Reading app ID from 1Password..."
APP_ID=$(op item get "$ITEM" --vault "$VAULT" --fields app_id --reveal)

# Build JSON payload with bun (handles YAML conversion and proper JSON encoding)
echo "Converting manifest to JSON..."
PAYLOAD=$(bun -e "
  const yaml = require('yaml');
  const fs = require('fs');
  const manifest = yaml.parse(fs.readFileSync('$MANIFEST_PATH', 'utf8'));
  process.stdout.write(JSON.stringify({ app_id: '$APP_ID', manifest }));
")

# Validate manifest first
echo "Validating manifest..."
VALIDATE_PAYLOAD=$(bun -e "
  const yaml = require('yaml');
  const fs = require('fs');
  const manifest = yaml.parse(fs.readFileSync('$MANIFEST_PATH', 'utf8'));
  process.stdout.write(JSON.stringify({ manifest }));
")

VALIDATE_RESPONSE=$(curl -s -X POST "$SLACK_API/apps.manifest.validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$VALIDATE_PAYLOAD")

VALIDATE_OK=$(echo "$VALIDATE_RESPONSE" | bun -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(String(data.ok));
")

if [ "$VALIDATE_OK" != "true" ]; then
  echo "Manifest validation failed:"
  echo "$VALIDATE_RESPONSE" | bun -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    for (const err of (data.errors || [])) console.error('  -', err.message || JSON.stringify(err));
  "
  exit 1
fi

echo "Manifest valid."

# Apply manifest
echo "Applying manifest to Slack..."
UPDATE_RESPONSE=$(curl -s -X POST "$SLACK_API/apps.manifest.update" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$PAYLOAD")

UPDATE_OK=$(echo "$UPDATE_RESPONSE" | bun -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(String(data.ok));
")

if [ "$UPDATE_OK" != "true" ]; then
  echo "Manifest update failed:"
  echo "$UPDATE_RESPONSE" | bun -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.error(JSON.stringify(data, null, 2));
  "
  exit 1
fi

echo ""
echo "Done. Evee's manifest synced to Slack."
