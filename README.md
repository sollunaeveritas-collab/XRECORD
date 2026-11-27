# XRecord — Android prototype

XRecord is an Expo + React Native Android project with a Kotlin native module prototype.

## Included
- XRecord interface and in-app test harness.
- Android MediaProjection consent flow.
- Foreground capture service that samples a small grid near the screen center.
- Simple RGB frame-to-frame change detection.
- Android notification and a compact floating status indicator.
- GitHub Actions workflow to attempt a debug APK build.

## Build from GitHub
1. Upload the contents of this ZIP to the **root** of `sollunaeveritas-collab/XRECORD` on branch `main` (not the containing folder).
2. Open the repository's **Actions** tab.
3. Select **Build XRecord Android APK** and run it, or let the workflow run after the commit.
4. When the run succeeds, open the run and download the `XRecord-debug-apk` artifact.

## Local build
Requires Node.js 20, Java 17, Android SDK and Android Studio:
```bash
npm install
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleDebug
```

## Android first run
- Install the debug APK on an Android device.
- Grant "Display over other apps" permission when prompted.
- Start monitoring and accept Android's MediaProjection screen-capture confirmation.
- Stop monitoring from the app to release the capture session.

## Important limitations
- This is a source prototype, not a verified production APK. The GitHub Actions build must complete successfully and the app must be tested on a physical phone.
- The detector uses a basic fixed RGB-difference threshold. The sensitivity and zone controls shown in the UI are not yet wired into native detection.
- The floating indicator is a basic status pill, not yet draggable/resizable.
- The app does **not** inject taps or automate input in third-party games/apps. Test button presses in the UI are simulated inside XRecord only.
- Android version/vendor restrictions and permission flows vary. MediaProjection requires explicit user consent.
- Captured frames are processed locally in memory; this prototype does not upload or save screenshots.

## Repository layout
- `App.tsx` — React Native UI and local test harness.
- `modules/xrecord-native/` — Kotlin React Native module and capture foreground service.
- `.github/workflows/android.yml` — debug APK build workflow.
