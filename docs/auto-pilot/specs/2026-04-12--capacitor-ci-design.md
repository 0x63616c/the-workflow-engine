# Capacitor iOS CI/CD Pipeline Design Spec

## Overview

GitHub Actions workflow that builds the Capacitor iOS app using Fastlane and uploads it to TestFlight. Triggered manually (workflow_dispatch) or automatically when native iOS files change on push to main. Code signing handled by Fastlane match with certs stored in a private GitHub repo. The existing web deploy pipeline and OTA system are untouched.

## Assumptions

- **App Store Connect API key** is used for authentication (not Apple ID/password), avoiding 2FA issues in CI.
- **Fastlane match** uses `git` storage type (private GitHub repo), not S3 or GCS.
- **Match type is `appstore`** for TestFlight distribution (not `development` or `adhoc`).
- **Xcode version**: The workflow uses `macos-15` runner which ships with Xcode 16.x. No explicit Xcode version selection needed unless a specific version is required.
- **Bundle version auto-increment**: Fastlane `increment_build_number` uses the GitHub Actions run number, giving a monotonically increasing build number without manual management.
- **Marketing version** stays at `1.0` (from pbxproj) and is updated manually when needed.
- **No Slack notifications** for iOS builds initially. Can be added later by copying the pattern from deploy.yml.
- **Gemfile lives at `apps/web/ios/`** alongside the Fastlane config, keeping iOS tooling self-contained.
- **SPM package resolution** is handled by `xcodebuild` automatically. The CapApp-SPM local package references `capacitor-swift-pm` v8.3.0.
- **The web build step in CI uses Bun** (not npm), matching the monorepo convention. `bun install` at repo root, then `bun run build` in `apps/web/`, then `bunx cap sync ios`.

## Architecture

```
Push to main (path filter) or workflow_dispatch
  |
  v
[ios-build.yml on macos-15]
  |
  +-- Setup: Install Bun, install deps, build web, cap sync
  |
  +-- Signing: Fastlane match (fetch certs from private repo)
  |
  +-- Build: Fastlane gym (xcodebuild archive + export)
  |
  +-- Upload: Fastlane pilot (upload to TestFlight)
  |
  +-- (Optional) Notify: Post result (future enhancement)
```

Single job, sequential steps. No parallelism needed since each step depends on the previous.

## Implementation Details

### 1. GitHub Actions Workflow (`.github/workflows/ios-build.yml`)

```yaml
name: iOS Build

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/ios/**'
      - 'apps/web/capacitor.config.ts'
      - 'apps/web/package.json'
  workflow_dispatch:

concurrency:
  group: ios-build
  cancel-in-progress: true

jobs:
  build:
    name: Build & Upload to TestFlight
    runs-on: macos-15
    defaults:
      run:
        working-directory: apps/web/ios
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile
        working-directory: .

      - name: Build web
        run: bun run build
        working-directory: apps/web

      - name: Capacitor sync
        run: bunx cap sync ios
        working-directory: apps/web

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
          working-directory: apps/web/ios

      - name: Build and upload to TestFlight
        run: bundle exec fastlane release
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_CONTENT: ${{ secrets.ASC_KEY_CONTENT }}
          BUILD_NUMBER: ${{ github.run_number }}
```

**Key details:**
- `macos-15` runner: free for public repos, includes Xcode 16.x and all iOS SDKs.
- `concurrency: ios-build` with `cancel-in-progress: true`: prevents parallel iOS builds.
- `timeout-minutes: 30`: iOS builds are slow. Prevents runaway builds.
- `paths` trigger: only fires when `apps/web/ios/**`, `apps/web/capacitor.config.ts`, or `apps/web/package.json` changes.
- `workflow_dispatch`: allows manual trigger from GitHub UI for any branch.
- `working-directory` defaults to `apps/web/ios` for Fastlane steps, overridden for bun/web steps.

### 2. Fastlane Configuration (`apps/web/ios/fastlane/`)

#### `apps/web/ios/fastlane/Appfile`

```ruby
app_identifier("co.worldwidewebb.theworkflowengine")
```

No `apple_id` or `team_id` here. API key auth doesn't need them in the Appfile.

#### `apps/web/ios/fastlane/Matchfile`

```ruby
git_url("https://github.com/0x63616c/certificates.git")
storage_mode("git")
type("appstore")
app_identifier(["co.worldwidewebb.theworkflowengine"])
```

#### `apps/web/ios/fastlane/Fastfile`

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :release do
    setup_ci

    api_key = app_store_connect_api_key(
      key_id: ENV["ASC_KEY_ID"],
      issuer_id: ENV["ASC_ISSUER_ID"],
      key_content: ENV["ASC_KEY_CONTENT"],
      is_key_content_base64: true
    )

    match(
      type: "appstore",
      api_key: api_key,
      readonly: true
    )

    increment_build_number(
      build_number: ENV["BUILD_NUMBER"],
      xcodeproj: "App/App.xcodeproj"
    )

    build_app(
      workspace: nil,
      project: "App/App.xcodeproj",
      scheme: "App",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "./build",
      output_name: "TheWorkflowEngine.ipa",
      clean: true
    )

    upload_to_testflight(
      api_key: api_key,
      skip_waiting_for_build_processing: true,
      skip_submission: true
    )
  end
end
```

**Key details:**
- `setup_ci`: Creates a temporary keychain on CI runners. Required for code signing on GitHub Actions.
- `match(readonly: true)`: Only fetches certs, never creates new ones. Prevents CI from accidentally overwriting certs.
- `increment_build_number`: Uses `BUILD_NUMBER` env var (set to `github.run_number` in the workflow), giving monotonically increasing build numbers.
- `build_app` uses `project:` not `workspace:` because the Capacitor project uses SPM (local package), not CocoaPods.
- `skip_waiting_for_build_processing: true`: Don't block CI waiting for Apple to process the build.
- `skip_submission: true`: Don't auto-submit for TestFlight review. Just upload.

### 3. Gemfile (`apps/web/ios/Gemfile`)

```ruby
source "https://rubygems.org"

gem "fastlane", "~> 2.226"
```

Minimal. Only Fastlane. The `ruby/setup-ruby` action with `bundler-cache: true` handles `bundle install` and caching.

### 4. Xcode Project Changes

The pbxproj currently has:
- `DEVELOPMENT_TEAM = ""` (empty)
- `CODE_SIGN_STYLE = Automatic`
- `CURRENT_PROJECT_VERSION = 1`
- `MARKETING_VERSION = 1.0`

**No changes needed to the Xcode project.** Fastlane match overrides code signing settings at build time. The `DEVELOPMENT_TEAM` will be set by match based on the provisioning profile. `increment_build_number` updates `CURRENT_PROJECT_VERSION` in the pbxproj before building.

### 5. GitHub Secrets Required

| Secret | Description | How to get |
|--------|-------------|------------|
| `MATCH_PASSWORD` | Encryption password for match repo | Choose any strong password, used when running `fastlane match` locally for the first time |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64-encoded `username:PAT` for cloning the private certs repo | `echo -n "0x63616c:ghp_xxx" \| base64` where `ghp_xxx` is a GitHub PAT with `repo` scope |
| `ASC_KEY_ID` | App Store Connect API Key ID | From App Store Connect > Users and Access > Integrations > Keys |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID | Same page as above, shown at top |
| `ASC_KEY_CONTENT` | Base64-encoded `.p8` API key file content | `base64 -i AuthKey_XXXXXXXXXX.p8` |

## File Structure

### Files to create

```
apps/web/ios/Gemfile                    # Fastlane dependency
apps/web/ios/fastlane/Appfile           # App identifier
apps/web/ios/fastlane/Matchfile         # Match config (cert repo, type)
apps/web/ios/fastlane/Fastfile          # Build lane definition
.github/workflows/ios-build.yml         # GitHub Actions workflow
```

### Files to modify

None. The existing `ci.yml`, `deploy.yml`, Xcode project, and Capacitor config are untouched.

### Files NOT to create

- No `.env` files (secrets come from GitHub Secrets)
- No `Gemfile.lock` (generated by `bundle install`, will be created on first run and should be committed)
- No Xcode scheme files (default "App" scheme is shared and already works)

## Testing Strategy

### Static validation (can run without Apple credentials)

1. **YAML lint**: Validate `ios-build.yml` is valid GitHub Actions YAML.
2. **Ruby syntax**: `ruby -c apps/web/ios/fastlane/Fastfile` to check Fastfile syntax.
3. **Gemfile validity**: `cd apps/web/ios && bundle check` after `bundle install`.
4. **Path filter test**: Verify the workflow triggers only when expected files change by examining the `paths` config.

### Integration validation (requires Apple credentials, done by Calum post-PR)

1. Run `fastlane match development` and `fastlane match appstore` locally to populate the certs repo.
2. Trigger `workflow_dispatch` manually on the feature branch.
3. Verify the build succeeds and an IPA appears in TestFlight.

## E2E Verification Plan

Since this workflow requires Apple Developer credentials and can only truly run in GitHub Actions with secrets configured, the verification is split into two phases:

### Phase 1: Automated (agent can do)

1. **File existence**: Verify all 5 files exist at their expected paths.
2. **Workflow YAML parse**: Use `python -c "import yaml; yaml.safe_load(open('.github/workflows/ios-build.yml'))"` or equivalent to validate YAML.
3. **Fastfile syntax**: Run `ruby -c apps/web/ios/fastlane/Fastfile`.
4. **Gemfile syntax**: Run `ruby -c apps/web/ios/Gemfile`.
5. **Trigger paths**: Read the workflow YAML and confirm it triggers on `apps/web/ios/**`, `apps/web/capacitor.config.ts`, and `apps/web/package.json`.
6. **Secret references**: Confirm all 5 secrets (`MATCH_PASSWORD`, `MATCH_GIT_BASIC_AUTHORIZATION`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT`) are referenced in the workflow.
7. **No modifications to existing files**: `git diff --name-only` should show only the 5 new files.

### Phase 2: Manual (Calum does post-merge)

1. Complete the manual setup steps from the alignment doc (register app ID, create certs repo, etc.).
2. Add GitHub Secrets.
3. Trigger workflow_dispatch.
4. Confirm build completes and IPA appears in TestFlight.

## Error Handling

### Build failures
- Fastlane outputs detailed logs. GitHub Actions captures all stdout/stderr.
- `timeout-minutes: 30` kills hung builds.
- `concurrency` with `cancel-in-progress` prevents queue buildup.

### Signing failures
- `match(readonly: true)` fails fast if certs don't exist (instead of trying to create new ones).
- Error message will clearly state "No profiles/certificates found" if match repo is empty or MATCH_PASSWORD is wrong.

### Upload failures
- `skip_waiting_for_build_processing` means the upload step only waits for the upload itself, not Apple's processing.
- If the API key is invalid, Fastlane shows the specific auth error from Apple's API.

### Version conflicts
- `increment_build_number` uses `github.run_number` which is globally unique per workflow. No two builds will ever have the same build number.
- If a build number is rejected by Apple (already exists), re-running the workflow gets a new run_number.
