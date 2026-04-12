# Xcode 26 iOS Build Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update CI to build with Xcode 26 / iOS 26 SDK to meet Apple's April 28, 2026 deadline for App Store submissions.

**Architecture:** Single workflow file change (`macos-15` -> `macos-26`), plus minor Xcode project updates for Swift 6 compatibility if needed. Capacitor 8.3.0 already requires Xcode 26, so dependencies are aligned. SPM-based project (no CocoaPods).

**Tech Stack:** GitHub Actions, Fastlane 2.226, Capacitor 8.3.0, SPM, Xcode 26

---

## Context

- **Apple deadline:** April 28, 2026 - all iOS/iPadOS apps must be built with iOS 26 SDK
- **Current CI:** `macos-15` runner = Xcode 16.x = iOS 18.5 SDK
- **Available:** `macos-26` and `macos-26-arm64` runners (released April 8-9, 2026)
- **Capacitor 8 docs confirm:** Xcode 26.0 minimum required
- **Project state:** Already on Capacitor 8.3.0, deployment target iOS 15.0, Swift 5.0, SPM
- **GitHub issue:** #127

## File Map

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `.github/workflows/ios-build.yml:22` | `runs-on: macos-15` -> `macos-26` |
| Verify | `apps/web/ios/App/App.xcodeproj/project.pbxproj` | Confirm `IPHONEOS_DEPLOYMENT_TARGET = 15.0` still valid (it is, Cap 8 min is 15.0) |
| Verify | `apps/web/ios/App/CapApp-SPM/Package.swift` | Confirm `swift-tools-version: 5.9` and `.iOS(.v15)` still valid with Xcode 26 |
| No change | `apps/web/ios/fastlane/Fastfile` | No Xcode-version-specific config, uses project defaults |
| No change | `apps/web/ios/Gemfile` | Fastlane 2.226 supports Xcode 26 |

---

### Task 1: Update GitHub Actions Runner

**Files:**
- Modify: `.github/workflows/ios-build.yml:22`

- [ ] **Step 1: Update runner from `macos-15` to `macos-26`**

```diff
-    runs-on: macos-15
+    runs-on: macos-26
```

This single change moves CI to Xcode 26 (ships with iOS 26 SDK). `macos-26` runners use Apple Silicon (M-series) by default.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ios-build.yml
git commit -m "ci: update iOS build runner to macos-26 for Xcode 26

Apple requires iOS 26 SDK (Xcode 26+) for App Store submissions
starting April 28, 2026. Switches from macos-15 (Xcode 16.x) to
macos-26 runner.

Closes #127"
git push
```

---

### Task 2: Verify Build Succeeds

- [ ] **Step 1: Trigger workflow manually**

```bash
gh workflow run ios-build.yml
```

- [ ] **Step 2: Watch build**

```bash
gh run watch
```

Expected: Build completes, uploads to TestFlight, Evee posts success to Slack.

- [ ] **Step 3: If build fails - check Swift version compatibility**

Xcode 26 ships Swift 6.x. If Swift 6 strict concurrency causes warnings-as-errors:

Option A (quick): Add `SWIFT_STRICT_CONCURRENCY = minimal` to build settings
Option B (proper): Fix concurrency warnings in Swift source files

Since this is a Capacitor webview app with minimal native Swift code, unlikely to hit issues. But if it does, the fix would be in `project.pbxproj` build settings.

- [ ] **Step 4: If Ruby/Fastlane issues on new runner**

`macos-26` runners may ship different Ruby version. If `setup-ruby` step fails:
- Check runner includes Ruby 3.3
- May need to update `ruby/setup-ruby@v1` action or Ruby version

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Swift 6 concurrency errors | Low | Medium | Minimal native code (Capacitor webview), add `SWIFT_STRICT_CONCURRENCY = minimal` if needed |
| Runner not GA yet | Very Low | High | `macos-26` already in runner-images releases (April 8). Fallback: pin Xcode version on `macos-15` if available |
| Fastlane incompatibility | Very Low | Low | Fastlane 2.226 actively maintained, Xcode 26 support expected |
| Code signing changes | Very Low | Medium | Match handles provisioning, not Xcode-version-dependent |

## Rollback

Revert single commit. Change `macos-26` back to `macos-15`. App Store deadline is April 28, so rollback buys time but doesn't remove requirement.
