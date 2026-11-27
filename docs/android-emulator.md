# Test an app on the Android emulator

This guide shows how to run the apps in Chrome on an Android emulator on a Mac, install an app as a PWA and start it. It is for developers and for agents. Agents can do all steps with `adb` commands, without a person at the emulator.

Use the emulator for features that only a phone has: the install of a PWA, the window of an installed app, the back gesture, notifications and the media controls. The browser tests (`pnpm e2e`) cannot check these.

## Limits of the emulator

- The emulator is not a real phone. Battery saver, the lock screen and the background behavior of Android can be different. For a feature that depends on them, also test on a real phone.
- The system image has its own Chrome version. It can be older than the Chrome on a phone (on the image `android-36` of 2026-11: Chrome 128). To update Chrome, sign in to the Play Store with a Google account.
- On `http://localhost`, Chrome does not make a real installed app (WebAPK). It makes a shortcut on the home screen. The shortcut opens the app in its own window without the address bar, like an installed app. A real WebAPK needs an HTTPS address: install the app from `https://johschmidt42.github.io/pocket-apps/` for that.

## Set up once

1. Install Android Studio. For example, use the JetBrains Toolbox.
2. Start Android Studio once and finish its setup. It installs the Android SDK in `~/Library/Android/sdk`.
3. In Android Studio, open the Device Manager and add a virtual device. Use a phone (for example "Medium Phone") with a system image **with Google Play** (tag `google_apis_playstore`, not only "Google APIs"). Without the Play services, Chrome does not install PWAs.
4. Give the tools short names. Add these lines to `~/.zshrc`:

   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   ```

   Then `adb` and `emulator` work in a new terminal. The rest of this guide uses these names.

5. Find the name of the virtual device:

   ```bash
   emulator -list-avds
   ```

   The examples below use `Medium_Phone_API_36`.

## Start the emulator

```bash
emulator -avd Medium_Phone_API_36 -no-boot-anim -gpu swiftshader_indirect &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
```

The emulator opens in its own window. The loop ends when Android has started.

`-gpu swiftshader_indirect` makes the emulator draw with the CPU, not with the graphics chip of the Mac. Use it always. With the graphics chip, the emulator stopped (`qemu-system-aarch64 quit unexpectedly`) as soon as Chrome started: the Metal driver of macOS crashed (seen 2026-11-27 on an M1 Mac). The software graphics are slower, but enough for the apps.

## Open a local build in Chrome on the emulator

1. Prepare the repository once per terminal, as for all other commands (see `AGENTS.md`):

   ```bash
   nvm use
   pnpm install
   ```

2. Check that port 4173 is free:

   ```bash
   lsof -nP -iTCP:4173 -sTCP:LISTEN
   ```

   No output: the port is free. If another worktree already serves its `release/` on port 4173, do not stop that server. Use another port, for example 4174:
   - Copy `scripts/serve-release.mjs` to a temporary file outside the repository.
   - In the copy, change the constant `const PORT = 4173;` to `4174`, and replace the import of `ROOT_DIR` with `const ROOT_DIR = "<the folder of your worktree>";`.
   - Start the copy with `node` instead of `pnpm serve` in step 3. Use port 4174 in all later steps.

3. Build the apps and start the web server:

   ```bash
   pnpm build
   pnpm serve &
   ```

   `pnpm serve` serves `release/` at `http://localhost:4173/pocket-apps/`. It runs until you stop it, so start it in the background (`&`) or in a second terminal. It must run while you use the app on the emulator, also when you start an installed app.

4. Connect port 4173 of the emulator to port 4173 of the Mac:

   ```bash
   adb reverse tcp:4173 tcp:4173
   ```

   Now `localhost:4173` in Chrome on the emulator is the web server on the Mac. For Chrome, `localhost` is a secure address: the service worker, the install of a PWA and the login to Dropbox or OneDrive work. The connection ends when the emulator stops. Run the command again after each start of the emulator, also after a start from a snapshot.

5. Open an app:

   ```bash
   adb shell am start -a android.intent.action.VIEW \
     -d "http://localhost:4173/pocket-apps/workout-timer.html" com.android.chrome
   ```

   When Chrome starts for the first time, it shows some screens first:
   - Tap "Use without an account".
   - Tap "Continue" and "Allow" if a feature of the app needs notifications. Else tap "No thanks".

   After these screens, Chrome opens the address. These are screens of Android and Chrome, so `uiautomator dump` shows their buttons by text (see "Control the emulator with commands").

## Install an app as a PWA

1. Open the app in Chrome on the emulator (see above).
2. Start the install in one of two ways:
   - Tap the button "Installieren" in the header (a download icon on a phone). Chrome shows the button only when it can install the page. If it is not there yet, tap the page once and wait some seconds. The button is part of the web page: `uiautomator dump` does not show it. Find its place on a screenshot. On the image "Medium Phone", it is at about `adb shell input tap 902 272`.
   - Or open the Chrome menu (the three dots at the top right, `adb shell input tap 1017 136`) and tap "Add to Home screen". Chrome then asks: "Install" or "Create shortcut". Tap "Install". "Create shortcut" opens the app in a normal Chrome tab, not in an app window.

3. Chrome shows the dialog "Install app": tap "Install". On `localhost`, Chrome then shows the dialog "Add to home screen" with the icon: tap "Add to home screen". All these dialogs are from Chrome, so `uiautomator dump` shows their buttons. Each dialog comes after a short delay: wait for it before you tap.

4. The app is now on the home screen with its icon. The label under the icon is the title of the app (`pocketApp.title` in its `package.json`, for example "Workout Timer"). Android can shorten a long label with "…". If the first page is full or has an old icon, Android puts the icon on the next page: swipe to the left.

To check a real install (WebAPK), install the app from `https://johschmidt42.github.io/pocket-apps/` in the same way. Then find its package:

```bash
adb shell pm list packages | grep webapk
```

## Start the installed app

- On the emulator: tap the icon on the home screen.
- With `adb`: go to the home screen and tap the icon. Find the place of the icon in the text of the screen (see "Control the emulator with commands"):

  ```bash
  adb shell input keyevent KEYCODE_HOME
  adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o 'text="Workout Timer"[^>]*bounds="[^"]*"'
  adb shell input tap 170 237   # the middle of the bounds, for example [67,94][272,380]
  ```

  If `grep` finds nothing, the icon is on another page. Swipe to the next page with `adb shell input swipe 900 1200 150 1200 300`, then search again.

- A real WebAPK also starts with its package name:

  ```bash
  adb shell monkey -p <package> -c android.intent.category.LAUNCHER 1
  ```

To check that the app runs as an installed app:

```bash
adb shell dumpsys activity activities | grep topResumedActivity
```

An installed app shows `WebappActivity` (a shortcut) or the package of the WebAPK. A normal tab shows `ChromeTabbedActivity`.

## Keep the installed apps with a snapshot

A snapshot keeps the whole state of the emulator: the memory, the data, the installed apps and the open apps. A start from a snapshot takes some seconds, and all apps are already installed.

1. Install the apps that you need (see above).
2. Save the state:

   ```bash
   adb emu avd snapshot save pwas
   ```

3. Next time, start the emulator from this state, and do not change the snapshot:

   ```bash
   emulator -avd Medium_Phone_API_36 -no-boot-anim -gpu swiftshader_indirect -snapshot pwas -no-snapshot-save &
   ```

   Android is ready after some seconds. Then run `adb reverse` again and start the web server, if it does not run (see "Open a local build"). Use the same `-gpu` option as when you saved the snapshot. With another option, the emulator writes `Snapshot file cannot be used, incompatible version` and starts without the snapshot: the installed apps are then not there.

Show the snapshots with `adb emu avd snapshot list`. Snapshots are in `~/.android/avd/<device>.avd/snapshots/`. They are not in the repository.

A snapshot also keeps the data of Chrome, for example the storage that you picked. Save a new snapshot after a change that you want to keep.

## After a new app or a change

The snapshot holds the apps as shortcuts from `localhost:4173`. Thus the emulator tests the local build, before it goes to GitHub Pages.

- **A change to an existing app:** do nothing. The shortcut loads the current build from `localhost:4173`.
- **A new app, or a new title or emoji of an app:** Android keeps the name and the icon of a shortcut from the time of the install. Do these steps:
  1. Start the emulator from the snapshot and open the local build (see above).
  2. Install the app (see "Install an app as a PWA"). For a new title or emoji, first remove the old icon: touch and hold it, and drag it to "Remove" at the top of the screen. With `adb`: `adb shell input draganddrop <x> <y> 540 160 2500` (the middle of the icon to the top). `adb shell dumpsys shortcut | grep -c "Pinned:"` then shows one shortcut less.
  3. Save the snapshot again: `adb emu avd snapshot save pwas`.

## Control the emulator with commands

These commands help agents to test without a person.

If a real phone is also connected, `adb` does not know which device you mean. Then add `-s emulator-5554` to each `adb` command (`adb devices` shows the names).

| Task                                        | Command                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Tap a point (pixels of the screen)          | `adb shell input tap 540 1785`                                                     |
| Back gesture                                | `adb shell input keyevent KEYCODE_BACK`                                            |
| Home screen                                 | `adb shell input keyevent KEYCODE_HOME`                                            |
| Screenshot                                  | `adb exec-out screencap -p > screen.png`                                           |
| Texts and buttons of the screen             | `adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml`        |
| Open and close the notification shade       | `adb shell cmd statusbar expand-notifications`, `adb shell cmd statusbar collapse` |
| Notifications                               | `adb shell dumpsys notification --noredact`                                        |
| Media controls (title, play state, actions) | `adb shell dumpsys media_session`                                                  |
| Stop Chrome                                 | `adb shell am force-stop com.android.chrome`                                       |

- `uiautomator dump` shows the buttons of Android and of Chrome. It shows a web page only as one element "Web View". To tap an element of the page, find its place on a screenshot. The screen of the image "Medium Phone" has 1080 × 2400 pixels.
- Chrome on the emulator also accepts the DevTools protocol:

  ```bash
  adb forward tcp:9222 localabstract:chrome_devtools_remote
  ```

  Then a script can connect with Playwright (`chromium.connectOverCDP("http://localhost:9222")`) and run code in the page. While this connection is open, Chrome does not slow down pages in the background, and a permission that the connection gives (`Browser.grantPermissions`) holds only until the connection closes. Close the connection before you test the behavior in the background.

## Clean up

```bash
adb reverse --remove-all
adb forward --remove-all
adb emu kill
```

`adb emu kill` stops the emulator. Without `-no-snapshot-save`, the emulator saves its state at the stop, and the next start continues from there.
