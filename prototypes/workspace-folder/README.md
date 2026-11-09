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
