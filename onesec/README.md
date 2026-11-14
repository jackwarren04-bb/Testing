# Daily Second

A "one second a day" video diary for Android (Capacitor app; the same code also runs in a browser).

## Install on your phone
1. Download `dist/DailySecond.apk` on your Android phone.
2. Open it. Android will ask to allow installs from that source (browser/Files app) — allow it.
3. Open **Daily Second** from your app drawer. Allow camera/microphone when you first record,
   and notifications when you set the reminder (⚙ → Daily reminder).

## Features
- Record 3s with the camera (or import a video), pick the best 1-second moment, add a caption
- Calendar of thumbnails, streak, total movie length; add/edit past days
- Multiple journals
- Movie player: date range, date stamp/captions, 1–2s per clip, background music
- Export the movie and share/save it via the Android share sheet
- **Daily reminder** — real Android notifications, fire even when the app is closed, skipped on days
  you've already recorded, survive reboots. Tapping it opens the recorder.

Data is stored on the phone only (no cloud backup). Uninstalling the app deletes your clips.

## Build
Requires Node 22+, JDK 21, Android SDK (platform 35).

    npm install
    npx cap sync android
    cd android && ./gradlew assembleRelease   # -> app/build/outputs/apk/release/app-release.apk

Web code lives in `www/index.html`. The APK is signed with `android/app/daily-second.keystore`
(committed so rebuilds install as updates over the existing app — it is not a secret-grade key).
