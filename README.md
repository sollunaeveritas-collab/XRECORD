# XRecord 2.2 — Android source project

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

GitHub Actions builds the release APK and uploads `XRecord-2.2-release-apk`.

## Important
This source has not been compiled or device-tested in this environment. It is a complete source project, not a verified APK. Verify the Android build and calibrate coordinates on a test device before relying on it. Screen pixels are processed locally and are not uploaded.


## Выбор точки на экране (2.2)
В приложении нажмите «Выбрать кнопку на экране». Появится затемнённый экран с красным прицелом. Переместите прицел пальцем на нужную кнопку и нажмите «СОХРАНИТЬ». Координаты сохраняются в локальных настройках Android и отображаются в полях X/Y. Для этого должна быть включена служба специальных возможностей XRecord.


## XRecord 2.3 change

- PLAY now sends a coordinate tap whenever the AccessibilityService is connected and armed.
- It no longer refuses the tap just because no target package/window event was observed.
- The tap is a raw coordinate gesture; it does not require a visible Android button or clickable accessibility node.
- Test only in apps you own or are authorized to test. Android/app security can still reject or intercept gestures.


## XRecord 2.4

- Monitor-only build: automatic tapping is disabled.
- Adjustable color-difference threshold (1–60), default 10.
- Frame sampling interval reduced to 70 ms; event debounce is 250 ms.
- Displays frame-processing time for each detection.
- Screen capture and overlay remain subject to Android permissions.


## XRecord 2.5

- Restores coordinate-based automatic touch after a detected screen change.
- Uses the saved X/Y point; the point need not correspond to an Android clickable node.
- Adds configurable tap delay (0–2000 ms; default 0).
- Keeps sensitivity control and frame processing diagnostics from 2.4.
- Requires the XRecord AccessibilityService to be enabled; `tapSent` reports dispatch acceptance, not guaranteed app response.
- Intended for testing apps/games you own or are authorized to test.
