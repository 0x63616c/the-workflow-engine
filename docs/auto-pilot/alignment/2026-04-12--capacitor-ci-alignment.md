# Capacitor iOS CI/CD Pipeline - Alignment

## Approved Approach

Set up Fastlane + GitHub Actions CI pipeline that builds the Capacitor iOS app and uploads to TestFlight when native code changes. OTA web updates stay as-is (existing build hash auto-reload).

## Key Decisions

1. **Fastlane over Xcode Cloud** - keeps everything in GitHub Actions, more control
2. **Fastlane match for signing** - encrypted certs in a private GitHub repo
3. **TestFlight distribution** - no App Store review, iPad auto-updates
4. **macOS runner** - repo is public, so macOS runner minutes are free
5. **OTA stays as-is** - existing build hash polling + immediate reload is fine, no notification/grace period needed
6. **Trigger strategy** - workflow_dispatch (manual) + path filter on native files (ios/, capacitor.config.ts, Capacitor deps in package.json)

## Scope

### IN
- Fastlane config: Appfile, Matchfile, Fastfile in apps/web/ios/
- GitHub Actions workflow: .github/workflows/ios-build.yml
- Gemfile for Fastlane dependency management
- Documentation for manual setup steps (Apple Developer portal, match repo)

### OUT
- App Store submission
- Capgo or third-party OTA services
- New Capacitor plugins
- MDM Single App Mode setup
- Changes to existing OTA/build hash system
- Changes to existing deploy.yml or ci.yml

## Constraints
- Bun, not npm (for web build step in CI)
- 1Password for any local secrets
- Signing certs stored in private GitHub repo via fastlane match
- GitHub Secrets for CI (MATCH_PASSWORD, APPLE_ID, APP_STORE_CONNECT_API_KEY, etc.)

## Manual Steps Required from Calum (post-PR)
1. Register App ID (co.worldwidewebb.theworkflowengine) in Apple Developer portal
2. Register iPad UDID in Apple Developer portal
3. Create private GitHub repo for fastlane match certs (e.g. 0x63616c/certificates)
4. Create App Store Connect API key (for CI uploads)
5. Run `fastlane match development` and `fastlane match appstore` locally once to generate certs
6. Add GitHub Secrets: MATCH_PASSWORD, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_CONTENT, MATCH_GIT_BASIC_AUTHORIZATION
