#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <client-id> <client-secret>"
  exit 1
fi

CLIENT_ID="$1"
CLIENT_SECRET="$2"
VAULT="Homelab"
ITEM="Tailscale OAuth Client (CI)"
REPO="0x63616c/the-workflow-engine"

echo "Saving to 1Password (vault: $VAULT)..."
op item create \
  --vault "$VAULT" \
  --category login \
  --title "$ITEM" \
  --generate-password=false \
  "client-id=$CLIENT_ID" \
  "client-secret[password]=$CLIENT_SECRET" \
  2>/dev/null && echo "Created new item" ||
  op item edit "$ITEM" \
    --vault "$VAULT" \
    "client-id=$CLIENT_ID" \
    "client-secret[password]=$CLIENT_SECRET" \
    2>/dev/null && echo "Updated existing item"

echo "Setting GitHub secrets..."
gh secret set TS_OAUTH_CLIENT_ID --repo "$REPO" --body "$CLIENT_ID"
gh secret set TS_OAUTH_SECRET --repo "$REPO" --body "$CLIENT_SECRET"

echo ""
echo "Done. Saved to 1Password and updated GitHub secrets."
