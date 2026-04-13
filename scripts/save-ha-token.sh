#!/bin/bash
# Save Home Assistant long-lived access token to 1Password and GitHub secrets

echo "Paste your Home Assistant long-lived access token:"
read -rs HA_TOKEN

if [ -z "$HA_TOKEN" ]; then
  echo "No token entered. Aborting."
  exit 1
fi

echo ""
echo "Saving to 1Password (Homelab vault)..."
op item create \
  --vault Homelab \
  --category "API Credential" \
  --title "Home Assistant Token" \
  "credential=$HA_TOKEN" \
  "notesPlain=Long-lived access token for Workflow Engine API"

echo ""
echo "Saving to GitHub repo secrets..."
echo "$HA_TOKEN" | gh secret set HA_TOKEN --repo 0x63616c/the-workflow-engine

echo ""
echo "Done. Token saved to:"
echo "  - op://Homelab/Home Assistant/credential"
echo "  - GitHub secret: HA_TOKEN"
