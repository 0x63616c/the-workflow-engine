# Capacitor iOS - Handover Doc

## What's Working

- Fastlane + GitHub Actions CI pipeline builds .ipa and uploads to TestFlight
- All signing (match, certs, provisioning profiles) works
- Monthly cron rebuild to prevent 90-day TestFlight expiry
- Slack notifications on iOS build success/failure
- App installs from TestFlight on iPad
- Bundle ID: `co.worldwidewebb.theworkflowengine`
- Apple Developer Team ID: `X9E4HG27NK`

## What's Broken

The app shows a black screen on the iPad. The bundled React web content loads (dark theme = black background) but the `server.url` in `capacitor.config.json` is not being used to load from `http://homelab`.

## Root Cause

**KioskViewController is never instantiated by the storyboard.** The storyboard references `customClass="KioskViewController"` with `customModule="App"`, but at runtime Capacitor logs:

```
Unknown class _TtC3App19KioskViewController in Interface Builder file.
```

This means the Swift class can't be found by the Objective-C runtime at storyboard instantiation time. iOS falls back to the base `CAPBridgeViewController`, which works (the app runs) but none of our custom code executes (no `viewDidLoad`, no `capacitorDidLoad`, nothing).

### What Was Tried

1. `@objc(KioskViewController)` annotation - didn't help
2. `customModuleProvider="target"` in storyboard - didn't help
3. Removing `customModule` entirely - didn't help
4. Clean builds with uninstall/reinstall - didn't help

### Likely Cause

Capacitor 8 uses SPM (Swift Package Manager) via `CapApp-SPM`. The local package structure may be interfering with how the Swift class is registered in the Objective-C runtime. The mangled name `_TtC3App19KioskViewController` suggests the module name "App" is correct, but something in the SPM build graph prevents the class from being linked properly.

### Things to Try Next

1. **Check if KioskViewController.swift is in the Xcode project's compile sources** - open `project.pbxproj` and verify the file is in the `PBXSourcesBuildPhase`
2. **Try adding `@objc` to the class and removing `customModule` from storyboard** - use just `customClass="KioskViewController"` without any module
3. **Try SceneDelegate approach** instead of storyboard - create the view controller programmatically in `AppDelegate` or a `SceneDelegate`
4. **Check the CapApp-SPM package** - the local SPM package might need to reference the app target
5. **Look at Capacitor GitHub issues** for "Unknown class" + SPM - this might be a known issue

## Files Involved

- `apps/web/ios/App/App/KioskViewController.swift` - custom VC (currently has debug file-writing code, revert to simple version)
- `apps/web/ios/App/App/Base.lproj/Main.storyboard` - references KioskViewController
- `apps/web/ios/App/App/Info.plist` - has `NSAllowsArbitraryLoads` for HTTP
- `apps/web/capacitor.config.ts` - has `server.url` set to homelab (currently localhost:8765 for testing, change back)
- `apps/web/ios/App/App.xcodeproj/project.pbxproj` - build settings, check compile sources

## What to Revert Before Shipping

1. `apps/web/capacitor.config.ts` - change `localhost:8765` back to `http://homelab`
2. `apps/web/ios/App/App/KioskViewController.swift` - remove debug file-writing code, restore to clean version
3. `apps/web/ios/App/App/Base.lproj/Main.storyboard` - currently has `customModuleProvider="target"`, may need adjustment based on fix

## Key Context

- The `server.url` config in `capacitor.config.json` IS correctly set and IS present in the built app bundle
- Capacitor's `loadWebView()` uses `bridge.config.appStartServerURL` which should return the server URL when set
- The `WebViewAssetHandler.setServerUrl()` is called with the URL during `loadView()`
- Safari in the iPad simulator CAN load `http://localhost:8765` - the network works, ATS allows it
- The test server at localhost:8765 serves a blue page with "CAPACITOR WORKS" - if the URL loaded, we'd see blue not black
- Simulator screenshots via `xcrun simctl io screenshot` always show pure black (the simulator screenshot tool captures the raw framebuffer, which IS black)
- The Simulator.app visually shows the landscape black app correctly

## Secrets & Config

All GitHub Secrets are set and working:
- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` - App Store Connect API
- `MATCH_PASSWORD`, `MATCH_GIT_URL`, `MATCH_GIT_BASIC_AUTHORIZATION` - Fastlane match
- 1Password item "App Store Connect API" in Homelab vault has key ID, issuer ID, match password, and .p8 file

Certificates repo: `0x63616c/certificates` (private)
