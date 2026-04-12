# GitHub Secrets Setup

Required secrets for CI/CD workflows. Configure in repo Settings > Secrets and variables > Actions > Repository secrets.

## Secrets

| Secret | Source | How to Get |
|--------|--------|------------|
| `TS_OAUTH_CLIENT_ID` | Tailscale admin console | Settings > OAuth clients > Create, scope to `tag:ci` |
| `TS_OAUTH_SECRET` | Tailscale admin console | Generated with the OAuth client above |
| `SSH_PRIVATE_KEY` | Generate locally | See SSH Key Setup below |
| `GHRC_TOKEN` | GitHub Personal Access Token | Create at github.com/settings/tokens, scope `read:packages write:packages` |
| `INNGEST_EVENT_KEY` | 1Password | `op read "op://Homelab/Workflow Engine Inngest/event-key"` |
| `INNGEST_SIGNING_KEY` | 1Password | `op read "op://Homelab/Workflow Engine Inngest/signing-key"` |
| `HA_TOKEN` | 1Password | `op read "op://Homelab/Home Assistant/token"` |

`GITHUB_TOKEN` is automatic, no setup needed.

## Tailscale ACL Setup

Add `tag:ci` to ACL policy:

```json
{
  "tagOwners": {
    "tag:ci": ["autogroup:admin"]
  }
}
```

Grant SSH access from `tag:ci` to homelab:

```json
{
  "ssh": [
    {
      "action": "accept",
      "src": ["tag:ci"],
      "dst": ["tag:server"],
      "users": ["calum"]
    }
  ]
}
```

Adjust `dst` tag to match homelab's actual Tailscale tag.

## SSH Key Setup

```bash
ssh-keygen -t ed25519 -f ci-deploy-key -N ""
# Copy ci-deploy-key.pub to homelab:~calum/.ssh/authorized_keys
# Paste ci-deploy-key (private) as GitHub secret SSH_PRIVATE_KEY
# Delete local files: rm ci-deploy-key ci-deploy-key.pub
```

## Inngest Secrets

```bash
op read "op://Homelab/Workflow Engine Inngest/event-key"
# Paste as GitHub secret INNGEST_EVENT_KEY

op read "op://Homelab/Workflow Engine Inngest/signing-key"
# Paste as GitHub secret INNGEST_SIGNING_KEY
```
