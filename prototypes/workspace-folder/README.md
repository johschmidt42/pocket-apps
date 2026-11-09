# PROTOTYPE: data folder with users (throwaway)

This prototype lives only on the branch `prototype/workspace-folder`. It never goes to `main`.

## Question

Can Chrome let pocket-apps (HTML files opened via `file://`) use a data folder that the user picks once?

1. Can the pages read `users.json` and per-user files (`<user>/<app>.json`) without a file dialog?
2. Does the folder stay known across pages (launcher → app) and across a Chrome restart?
3. How many clicks and permission dialogs does it need per page load and per restart?

## Run

1. Open `prototype-launcher.html` in Chrome (double-click, or drag it into Chrome).
2. Follow the tabs "Durchgänge" 1 to 4.
3. Click "Protokoll kopieren" and send the log.

`prototype-workspace.js` holds the logic without DOM. The two HTML pages are only a shell.

## Known before the manual test (Playwright, Chromium, 2026-11-09)

- `showDirectoryPicker` exists under `file://`. The page is a secure context. Origin is `file://`.
- IndexedDB works under `file://`. Two pages in the same folder share it. It survives a restart.
- OPFS (`navigator.storage.getDirectory()`) is blocked under `file://` (SecurityError). Not needed.

## Result (manual test in Chrome, 2026-11-09)

Data folder inside the Google Drive folder ("PROTOTYP Pocket Apps Daten").

| Question | Answer |
| --- | --- |
| Read and write `users.json` and `<user>/<app>.json` without a file dialog | Yes |
| Folder known across pages (launcher → app → launcher) | Yes, permission "granted" at once, 0 clicks |
| Folder known after a Chrome restart | Yes, but permission is "prompt" |
| Clicks per Chrome session | 2, once: page button "Zugriff erlauben" + Chrome dialog "Allow" |
| "Allow on every visit" offered | No (only "Allow" / "Don't Allow" under `file://`) |
| Remove a user with data folder | Works (`removeEntry` recursive) |

Verdict: the data folder approach works in Chrome. It replaces one file dialog per app and page load with 2 clicks per Chrome session for all apps.

Log of the test:

```text
20:24:29 [Launcher] Beim Laden: Zugriff = prompt        (after Chrome restart)
20:25:45 [Launcher] Zugriff angefragt (Chrome-Dialog) → granted
20:25:49 [App] Beim Laden: Zugriff = granted
20:26:20 [App] Notiz gespeichert in johannes/prototype-app.json – ohne Datei-Dialog
20:26:40 [Launcher] Beim Laden: Zugriff = granted
20:26:52 [Launcher] Nutzer entfernt: Anna + Datenordner gelöscht
```

## Result 2: the same pages from a web address (http://localhost, 2026-11-09)

The same files, served by `python3 -m http.server` on `http://localhost:8765`.

| Question | Answer |
| --- | --- |
| Dialog after a Chrome restart | Three options: "Allow this time", **"Allow on every visit"**, "Don't allow" |
| After "Allow on every visit" and a Chrome restart | Access "granted" at once, **0 clicks** |

Verdict: only a web origin (http://localhost or https://) gets the persistent permission. Under `file://`, Chrome asks again after each restart (2 clicks).

## Result 3: GitHub Pages (https), desktop Chrome and Chrome on Android (2026-11-09)

URL: https://johschmidt42.github.io/pocket-apps/prototypes/workspace-folder/prototype-launcher.html

| Question | Desktop Chrome | Chrome on Android |
| --- | --- | --- |
| Folder dialog available | Yes | Yes |
| Google Drive folder selectable | Yes (synced folder) | Yes (Drive in the Android dialog) |
| Reads `users.json` from the Drive folder | Yes | Yes ("Johannes" shown) |
| Permission text | "Allow on every visit" offered | "… while tabs of this site are open" |
| After closing and reopening | 0 clicks (with "Allow on every visit") | Folder remembered, tap "Zugriff erlauben" again |
