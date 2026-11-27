# XRecord 2.1 — Android source project

XRecord captures the screen with Android MediaProjection, samples a small central grid, and shows a movable floating PLAY/PAUSE/STOP panel.

## Current behavior
- Tap START in the app and accept Android screen-capture permission.
- A floating panel appears in PAUSE.
- PLAY starts central color-change detection.
- PAUSE stops detection and disarms the accessibility tap action.
- The first app opened after leaving XRecord while PLAY is active is locked as the target app until PAUSE.
- On a detected change, XRecord requests one accessibility gesture at the configured X/Y pixel coordinates.
- Events are sent back to the React Native UI.

## Required permissions
1. Display over other apps.
2. Screen capture consent each session.
3. Accessibility service: enable XRecord in Android Settings > Accessibility.

Accessibility gestures are powerful. Only enable this for apps you own or are authorized to test. Android may restrict gestures, protected screens, or secure content. The tap point is in physical screen pixels and must be calibrated for the device.

## Build
Node.js 20 and Java 17:
```bash
npm install
npm run typecheck
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
```

GitHub Actions builds the release APK and uploads `XRecord-2.1-release-apk`.

## Important
This source has not been compiled or device-tested in this environment. It is a complete source project, not a verified APK. Verify the Android build and calibrate coordinates on a test device before relying on it. Screen pixels are processed locally and are not uploaded.
