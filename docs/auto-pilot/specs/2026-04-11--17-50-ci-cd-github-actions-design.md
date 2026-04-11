# CI/CD GitHub Actions Design Spec

## Overview

Add two GitHub Actions workflows to the-workflow-engine repo: a CI workflow that validates PRs (lint, typecheck, test), and a Deploy workflow that runs the same checks on push to main then deploys to the Mac Mini homelab via Kamal over Tailscale SSH. GitHub secrets replace 1Password CLI in CI. No 1Password service account needed.

## Assumptions

Decisions made autonomously:

- **Runner OS**: `ubuntu-latest` for both workflows. Bun and Kamal both support Linux x86_64. The Docker image builds remotely on homelab (arm64) via Kamal's `builder.remote` config, so runner arch doesn't matter for the final image.
- **Bun version**: Use `oven-sh/setup-bun@v2` with no pinned version (uses latest stable). The project doesn't pin bun version anywhere.
- **Kamal version**: Install via `gem install kamal` on the runner. Use latest stable. Kamal is a Ruby gem with no project-level version pin.
- **Tailscale action**: Use `tailscale/github-action@v3` with an OAuth client (not auth key). OAuth clients create ephemeral, tagged nodes that auto-expire. This is the recommended approach for CI runners.
- **Tailscale tags**: The OAuth client should be scoped to tag `tag:ci`. The Tailscale ACL must grant `tag:ci` SSH access to `homelab`. The user must configure this in the Tailscale admin console.
- **GHCR auth**: Use the automatic `GITHUB_TOKEN` (via `docker/login-action`). No additional secret needed for pushing images.
- **Concurrency**: Deploy workflow uses `concurrency: deploy` to prevent overlapping deploys. CI workflow uses `concurrency: ci-${{ github.ref }}` with `cancel-in-progress: true` to cancel stale PR runs.
- **.kamal/secrets modification**: The secrets file needs to support two modes: local dev (uses `op read`) and CI (uses plain env vars). Use shell conditional: if env var is already set, use it; otherwise fall back to `op read`. This keeps local dev working unchanged.
- **No caching**: Bun install is fast enough (~5s with lockfile). Skip dependency caching to keep workflows simple. Can add later if needed.
- **No matrix builds**: Only two apps, both use bun. Run steps sequentially in one job rather than a matrix. Simpler, fewer runner minutes.
- **Biome CI mode**: Use `bunx biome ci .` (not `biome check`). The `ci` command is the non-interactive check mode that fails on violations without auto-fixing. Matches what the pre-commit hook does semantically.
- **Vitest workspace**: Root `bun run test` runs `bun run --filter '*' test` which runs vitest in both apps. Use this in CI rather than running each app separately.
- **Typecheck workspace**: Root `bun run typecheck` runs `bun run --filter '*' typecheck` which runs `tsc --noEmit` in both apps. Use this in CI.
- **Import boundary check**: Include `bun run check:boundaries` in CI. This matches the pre-commit hook.
- **Deploy runs checks first**: The deploy workflow runs lint/typecheck/test as a prerequisite job. Deploy job depends on it via `needs: check`. If checks fail, deploy is skipped.
- **No environment protection**: GitHub Environments with required reviewers is overkill for a single-user project deploying to a home server.
- **Kamal remote builder**: The existing config uses `builder.remote: homelab`. In CI, the runner connects to homelab via Tailscale SSH, and Kamal SSHs to homelab for both building and deploying. This means the runner needs SSH access to homelab, which Tailscale provides.
- **SSH key for Kamal**: Kamal needs SSH access to homelab. In CI, use `webfactory/ssh-agent` with a deploy key stored as `SSH_PRIVATE_KEY` GitHub secret. This key must be authorized on homelab's `calum` user.
- **No Docker socket forwarding**: Kamal handles Docker interaction over SSH to the remote host. The runner itself doesn't need Docker running.

## Architecture

```
PR opened/updated to main
        |
        v
  [CI Workflow]
  - bun install
  - biome ci
  - typecheck (both apps)
  - vitest (both apps)
  - boundary check
        |
        v
  Pass/Fail status check on PR

Push to main (merge)
        |
        v
  [Deploy Workflow]
  Job 1: check (same as CI)
        |
        v (needs: check)
  Job 2: deploy
  - Connect to Tailscale (ephemeral node)
  - Setup SSH agent with deploy key
  - Install Kamal
  - kamal deploy
```

### Secrets Flow

**Local dev** (unchanged):
```
.kamal/secrets uses `op read "op://Homelab/..."` -> Kamal reads secrets -> deploys
```

**CI**:
```
GitHub Secrets -> env vars on runner -> .kamal/secrets detects env vars already set -> Kamal reads them -> deploys
```

## Implementation Details

### File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: Lint, Typecheck, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - name: Biome CI
        run: bunx biome ci .

      - name: Typecheck
        run: bun run typecheck

      - name: Test
        run: bun run test

      - name: Check import boundaries
        run: bun run check:boundaries
```

### File: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  check:
    name: Lint, Typecheck, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - name: Biome CI
        run: bunx biome ci .

      - name: Typecheck
        run: bun run typecheck

      - name: Test
        run: bun run test

      - name: Check import boundaries
        run: bun run check:boundaries

  deploy:
    name: Deploy to Homelab
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4

      - name: Connect to Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:ci

      - name: Setup SSH agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Install Kamal
        run: gem install kamal

      - name: Deploy with Kamal
        env:
          KAMAL_REGISTRY_PASSWORD: ${{ secrets.GITHUB_TOKEN }}
          INNGEST_EVENT_KEY: ${{ secrets.INNGEST_EVENT_KEY }}
          INNGEST_SIGNING_KEY: ${{ secrets.INNGEST_SIGNING_KEY }}
        run: kamal deploy
```

### File: `.kamal/secrets` (modified)

```bash
# CI sets these as env vars; local dev falls back to 1Password
KAMAL_REGISTRY_PASSWORD=${KAMAL_REGISTRY_PASSWORD:-$(op read "op://Homelab/GitHub Personal Access Token/token")}
INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY:-$(op read "op://Homelab/Workflow Engine Inngest/event-key")}
INNGEST_SIGNING_KEY=${INNGEST_SIGNING_KEY:-$(op read "op://Homelab/Workflow Engine Inngest/signing-key")}
```

This uses shell parameter expansion: if the env var is already set (CI), use it. Otherwise, call `op read` (local dev). Both paths work without changes to `config/deploy.yml`.

### GitHub Secrets to Configure

| Secret | Source | Purpose |
|--------|--------|---------|
| `TS_OAUTH_CLIENT_ID` | Tailscale admin console | Ephemeral CI node auth |
| `TS_OAUTH_SECRET` | Tailscale admin console | Ephemeral CI node auth |
| `SSH_PRIVATE_KEY` | Generate new ED25519 key pair | Kamal SSH to homelab |
| `INNGEST_EVENT_KEY` | Same value as in 1Password | Inngest runtime secret |
| `INNGEST_SIGNING_KEY` | Same value as in 1Password | Inngest runtime secret |

`GITHUB_TOKEN` is automatic, no setup needed. Used for GHCR push.

### Tailscale Setup (One-Time)

1. Go to Tailscale admin console > Settings > OAuth clients
2. Create OAuth client with tag `tag:ci`
3. In ACL policy, add:
   ```json
   {
     "tagOwners": {
       "tag:ci": ["autogroup:admin"]
     }
   }
   ```
4. Grant SSH access from `tag:ci` to homelab in ACL:
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
   (Adjust `dst` tag to match homelab's actual tag.)

### SSH Key Setup (One-Time)

1. Generate key: `ssh-keygen -t ed25519 -f ci-deploy-key -N ""`
2. Add `ci-deploy-key.pub` to homelab's `~calum/.ssh/authorized_keys`
3. Add `ci-deploy-key` (private) as GitHub secret `SSH_PRIVATE_KEY`
4. Delete local key files after setup

## File Structure

**Create:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

**Modify:**
- `.kamal/secrets` - Add env var fallback pattern

## Testing Strategy

### Workflow YAML Validation

- Use `actionlint` to validate both workflow files: `bunx actionlint .github/workflows/ci.yml .github/workflows/deploy.yml`
- Verify YAML parses correctly: `bun -e "const yaml = require('yaml'); yaml.parse(fs.readFileSync('.github/workflows/ci.yml', 'utf8'));"` (or equivalent)

### CI Workflow Testing

- Create a test PR to trigger the CI workflow
- Verify all steps run: bun install, biome ci, typecheck, test, boundaries
- Verify the workflow fails correctly: introduce a lint error on a branch, push, confirm CI fails
- Verify concurrency: push two commits rapidly, confirm first run is cancelled

### Deploy Workflow Testing

- Merge a PR to main
- Verify check job runs and passes
- Verify Tailscale connection establishes (check runner logs for "Connected to Tailscale")
- Verify SSH agent loads key
- Verify Kamal deploy runs successfully
- Verify the app is accessible on homelab after deploy

### .kamal/secrets Compatibility

- **Local test**: Run `kamal deploy` locally, verify it still reads from 1Password
- **CI simulation**: Set env vars manually, run `.kamal/secrets` in a subshell, verify values come from env vars not `op read`

## E2E Verification Plan

### Pre-merge Checks (can verify locally)

1. **YAML lint**: Run `actionlint` on both workflow files
   - PASS: No errors
   - FAIL: Any actionlint error

2. **Secrets file**: Source `.kamal/secrets` with env vars pre-set
   - PASS: Values match env vars, no `op` calls
   - FAIL: `op` is invoked when env vars are set

3. **Secrets file (local mode)**: Source `.kamal/secrets` without env vars (requires `op` CLI)
   - PASS: Values populated from 1Password
   - FAIL: Empty values or errors

### Post-merge Checks (require GitHub Actions)

4. **CI workflow triggers on PR**
   - PASS: Workflow appears in Actions tab, all steps green
   - FAIL: Workflow doesn't trigger or any step fails

5. **Deploy workflow triggers on push to main**
   - PASS: Check job passes, deploy job runs, Kamal output shows successful deploy
   - FAIL: Any job fails

6. **App is live after deploy**
   - PASS: `curl http://homelab:4301` returns expected response
   - FAIL: Connection refused or error response

7. **Tailscale ephemeral node cleanup**
   - PASS: After deploy job completes, no lingering CI node in Tailscale admin
   - FAIL: Stale `github-actions` node persists

## Error Handling

- **Tailscale connection failure**: Deploy job fails fast. Runner can't reach homelab. Fix: check OAuth client credentials and ACL policy.
- **SSH auth failure**: Deploy job fails at Kamal step. Fix: verify SSH key is in homelab's authorized_keys and matches the GitHub secret.
- **GHCR push failure**: Kamal deploy fails during image push. Fix: verify `GITHUB_TOKEN` has `packages:write` scope (it does by default for `contents: read` workflows, but may need explicit `permissions:` block if repo has restricted token permissions).
- **Kamal deploy failure**: Could be Docker, network, or config issue on homelab. Check Kamal output in GitHub Actions logs. Same debugging as local deploy.
- **Secrets not set**: Kamal fails with empty secret values. Fix: verify all GitHub secrets are configured in repo settings.
- **Concurrency**: `cancel-in-progress: false` on deploy prevents interrupted deploys. If a deploy is running, the next one queues. This is intentional.

### GHCR Token Permissions

If the repo has restricted default token permissions, add this to the deploy job:

```yaml
permissions:
  contents: read
  packages: write
```

This is included in the implementation details above as a safety measure. The `GITHUB_TOKEN` needs `packages:write` to push to GHCR.
