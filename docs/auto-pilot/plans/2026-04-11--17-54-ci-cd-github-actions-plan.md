# CI/CD GitHub Actions Implementation Plan

**Goal:** Add CI (PR validation) and Deploy (push-to-main) GitHub Actions workflows with Kamal deploy to Mac Mini homelab over Tailscale SSH.

**Architecture:** Two workflows: CI runs lint/typecheck/test/boundaries on PRs. Deploy runs same checks on push to main, then deploys via Kamal over Tailscale. GitHub Secrets replace 1Password in CI; `.kamal/secrets` uses env var fallback pattern so both local and CI work.

**Tech Stack:** GitHub Actions, Bun, Biome, Vitest, Tailscale (OAuth ephemeral nodes), Kamal (Ruby gem), GHCR (via GITHUB_TOKEN), webfactory/ssh-agent.

---

### Task 1: Create CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1:** Create directory `.github/workflows/` in worktree root
  ```bash
  mkdir -p .github/workflows
  ```

- [ ] **Step 2:** Create `.github/workflows/ci.yml` with this exact content:
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

- [ ] **Step 3:** Validate YAML syntax
  ```bash
  bun -e "import { parse } from 'yaml'; import { readFileSync } from 'fs'; parse(readFileSync('.github/workflows/ci.yml', 'utf8')); console.log('YAML valid')"
  ```
  Expected output: `YAML valid`

- [ ] **Step 4:** Commit
  ```bash
  git add .github/workflows/ci.yml
  git commit -m "feat: add CI workflow for PR validation"
  git push
  ```

---

### Task 2: Create Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1:** Create `.github/workflows/deploy.yml` with this exact content:
  ```yaml
  name: Deploy

  on:
    push:
      branches: [main]

  concurrency:
    group: deploy
    cancel-in-progress: false

  permissions:
    contents: read
    packages: write

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

  Note: `permissions: { contents: read, packages: write }` is set at workflow level per reviewer feedback. This ensures `GITHUB_TOKEN` can push to GHCR regardless of repo default token permissions.

- [ ] **Step 2:** Validate YAML syntax
  ```bash
  bun -e "import { parse } from 'yaml'; import { readFileSync } from 'fs'; parse(readFileSync('.github/workflows/deploy.yml', 'utf8')); console.log('YAML valid')"
  ```
  Expected output: `YAML valid`

- [ ] **Step 3:** Commit
  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "feat: add deploy workflow with Kamal over Tailscale"
  git push
  ```

---

### Task 3: Modify .kamal/secrets for CI Compatibility

**Files:**
- Modify: `.kamal/secrets`

- [ ] **Step 1:** Replace contents of `.kamal/secrets` with env var fallback pattern:
  ```bash
  # CI sets these as env vars; local dev falls back to 1Password
  KAMAL_REGISTRY_PASSWORD=${KAMAL_REGISTRY_PASSWORD:-$(op read "op://Homelab/GitHub Personal Access Token/token")}
  INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY:-$(op read "op://Homelab/Workflow Engine Inngest/event-key")}
  INNGEST_SIGNING_KEY=${INNGEST_SIGNING_KEY:-$(op read "op://Homelab/Workflow Engine Inngest/signing-key")}
  ```

  This uses shell parameter expansion: `${VAR:-fallback}`. If env var already set (CI), use it. Otherwise call `op read` (local dev).

  Note: Cannot read current `.kamal/secrets` content directly (permission denied on secret files). The spec provides exact 1Password paths. Verify these match existing file before overwriting by asking user or checking `config/deploy.yml` secret names (which reference `KAMAL_REGISTRY_PASSWORD`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` -- confirmed matching).

- [ ] **Step 2:** Validate secrets file syntax by sourcing with env vars pre-set:
  ```bash
  KAMAL_REGISTRY_PASSWORD=test INNGEST_EVENT_KEY=test INNGEST_SIGNING_KEY=test bash -c 'source .kamal/secrets && echo "KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD" && echo "INNGEST_EVENT_KEY=$INNGEST_EVENT_KEY" && echo "INNGEST_SIGNING_KEY=$INNGEST_SIGNING_KEY"'
  ```
  Expected output:
  ```
  KAMAL_REGISTRY_PASSWORD=test
  INNGEST_EVENT_KEY=test
  INNGEST_SIGNING_KEY=test
  ```
  This confirms env var fallback works: when vars are pre-set, `op read` is never called.

- [ ] **Step 3:** Commit
  ```bash
  git add .kamal/secrets
  git commit -m "feat: add env var fallback to .kamal/secrets for CI"
  git push
  ```

---

### Task 4: Validate Workflow Files with actionlint

**Files:**
- None (validation only)

- [ ] **Step 1:** Check if actionlint is installed:
  ```bash
  which actionlint
  ```
  If not found, install via Homebrew:
  ```bash
  brew install actionlint
  ```
  Per reviewer feedback: actionlint is a Go binary, not an npm package. Do not use `bunx actionlint`.

- [ ] **Step 2:** Run actionlint on both workflow files:
  ```bash
  actionlint .github/workflows/ci.yml .github/workflows/deploy.yml
  ```
  Expected output: no errors (empty output, exit code 0).

- [ ] **Step 3:** If actionlint reports errors, fix them in the relevant workflow file and re-run until clean. Commit any fixes:
  ```bash
  git add .github/workflows/
  git commit -m "fix: address actionlint findings in workflow files"
  git push
  ```

---

### Task 5: Verify Config Alignment

**Files:**
- None (verification only)

- [ ] **Step 1:** Verify `config/deploy.yml` secret names match what deploy workflow provides. Cross-check these three items:
  - `registry.password` references `KAMAL_REGISTRY_PASSWORD` -- deploy workflow sets `KAMAL_REGISTRY_PASSWORD: ${{ secrets.GITHUB_TOKEN }}`
  - `env.secret` lists `INNGEST_EVENT_KEY` -- deploy workflow sets `INNGEST_EVENT_KEY: ${{ secrets.INNGEST_EVENT_KEY }}`
  - `env.secret` lists `INNGEST_SIGNING_KEY` -- deploy workflow sets `INNGEST_SIGNING_KEY: ${{ secrets.INNGEST_SIGNING_KEY }}`

  All three confirmed matching from reading `config/deploy.yml` (lines 22-23 for registry, lines 34-35 for env secrets).

- [ ] **Step 2:** Verify `package.json` scripts match CI step commands:
  - `bun run typecheck` -- exists in package.json line 10: `"typecheck": "bun run --filter '*' typecheck"`
  - `bun run test` -- exists in package.json line 8: `"test": "bun run --filter '*' test"`
  - `bun run check:boundaries` -- exists in package.json line 12: `"check:boundaries": "bun run scripts/check-boundaries.ts"`
  - `bunx biome ci .` -- biome is in devDependencies (line 14)

  All confirmed matching.

- [ ] **Step 3:** Verify `builder.remote: homelab` in `config/deploy.yml` (line 25). This means Kamal SSHes to homelab for Docker build. The deploy workflow provides SSH access via webfactory/ssh-agent + Tailscale network. No additional config needed.

---

### Task 6: Document Required GitHub Secrets

**Files:**
- None (documentation in this plan, user action required)

The following GitHub secrets must be configured in the repo settings (`Settings > Secrets and variables > Actions > Repository secrets`) before the deploy workflow will succeed:

| Secret | Source | How to Get |
|--------|--------|------------|
| `TS_OAUTH_CLIENT_ID` | Tailscale admin console | Settings > OAuth clients > Create, scope to `tag:ci` |
| `TS_OAUTH_SECRET` | Tailscale admin console | Generated with the OAuth client above |
| `SSH_PRIVATE_KEY` | Generate locally | `ssh-keygen -t ed25519 -f ci-deploy-key -N ""`, add `.pub` to homelab `~calum/.ssh/authorized_keys`, paste private key as secret, delete local files |
| `INNGEST_EVENT_KEY` | 1Password | `op read "op://Homelab/Workflow Engine Inngest/event-key"` |
| `INNGEST_SIGNING_KEY` | 1Password | `op read "op://Homelab/Workflow Engine Inngest/signing-key"` |

`GITHUB_TOKEN` is automatic -- no setup needed for GHCR push.

- [ ] **Step 1:** User configures Tailscale ACL to grant `tag:ci` SSH access to homelab:
  ```json
  {
    "tagOwners": {
      "tag:ci": ["autogroup:admin"]
    }
  }
  ```
  And SSH rule:
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

- [ ] **Step 2:** User generates SSH deploy key and configures it:
  ```bash
  ssh-keygen -t ed25519 -f ci-deploy-key -N ""
  # Copy ci-deploy-key.pub content to homelab:~calum/.ssh/authorized_keys
  # Paste ci-deploy-key content into GitHub secret SSH_PRIVATE_KEY
  # Delete local files: rm ci-deploy-key ci-deploy-key.pub
  ```

- [ ] **Step 3:** User adds remaining secrets from 1Password:
  ```bash
  op read "op://Homelab/Workflow Engine Inngest/event-key"
  # Paste output as GitHub secret INNGEST_EVENT_KEY

  op read "op://Homelab/Workflow Engine Inngest/signing-key"
  # Paste output as GitHub secret INNGEST_SIGNING_KEY
  ```

---

### Task 7: E2E Verification (Post-Merge)

**Files:**
- None (verification only)

These checks run after secrets are configured and PR is merged.

- [ ] **Step 1:** Create test PR to verify CI workflow triggers:
  ```bash
  git checkout -b test/ci-verification
  echo "# CI test" >> README.md
  git add README.md
  git commit -m "test: verify CI workflow triggers"
  git push -u origin test/ci-verification
  gh pr create --title "test: verify CI workflow" --body "Temporary PR to verify CI workflow triggers. Will close after verification."
  ```

- [ ] **Step 2:** Check GitHub Actions tab. Verify CI workflow runs with all steps:
  ```bash
  gh run list --workflow=ci.yml --limit=1
  ```
  Expected: workflow run appears, status eventually shows `completed` with `success` conclusion.

- [ ] **Step 3:** Close and delete test PR/branch:
  ```bash
  gh pr close test/ci-verification --delete-branch
  ```

- [ ] **Step 4:** After merging the actual CI/CD PR to main, verify deploy workflow triggers:
  ```bash
  gh run list --workflow=deploy.yml --limit=1
  ```
  Expected: workflow run appears with check and deploy jobs.

- [ ] **Step 5:** Verify deploy succeeded by checking app is accessible:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://homelab:4301
  ```
  Expected: `200` (or appropriate health check response).

- [ ] **Step 6:** Verify Tailscale ephemeral node cleaned up after deploy:
  Check Tailscale admin console -- no lingering `github-actions` node should remain after the workflow completes.
