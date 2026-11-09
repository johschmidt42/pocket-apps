# pocket-apps

Small personal apps. Each app is **one HTML file**. You open it with a double-click. It needs no server. Most apps also work without internet.

## For users

### Start an app

1. Open the shared "Pocket Apps" folder on OneDrive or Google Drive.
2. Double-click `index.html`. It opens in your browser and shows all apps.
3. Click an app card. The app opens.
4. Click "Alle Apps" in the header to go back.

Each card shows the app version (for example `1.0`) and two icons. Move the mouse over an icon to see what it means:

- Disk icon: the app keeps your data in a file. A crossed-out disk: the app keeps nothing.
- Globe: the app needs the internet. A crossed-out Wi-Fi symbol: the app works without internet.

The header shows the app version, for example `1.0`. The moon button switches to dark mode. The sun button switches back to light mode.

### Keep your data

Some apps keep data, for example a shopping list. These apps ask you to create or open a data file (`.json`).

- Keep the data file in a safe place, for example in your own OneDrive or Google Drive folder.
- Use one data file in one browser tab at a time. Two open tabs can overwrite each other's changes.
- **Chrome and Edge** save changes into your data file automatically. The header bar shows "Gespeichert".
- **Firefox and Safari** cannot write into a file. Click "Speichern" to download the new version.

For Firefox and Safari, set the browser to ask where to save each download:

- Firefox: Settings → General → Downloads → "Always ask you where to save files".
- Safari: Settings → General → "File download location" → "Ask for each download".

Then select your old data file in the save dialog. Confirm that you want to replace it. Without this setting, the browser saves a new file in your download folder, for example `einkaufsliste (1).json`. Then open that new file next time.

### Updates

- The owner of the shared folder copies new app files into it. You do not have to do anything.
- If you keep a copy of an app file on your computer, replace it with the new file.
- A new app version can change the data format. Then the app downloads a copy of your old data file before it changes anything. The copy has a name like `einkaufsliste.backup-v1.json`. The number is the old data format, not the app version.
- An old app version cannot open data from a newer version. It shows an error. Use the newest app file.

## For developers

Read [AGENTS.md](AGENTS.md) for commands, layout and rules. Read [docs/decisions.md](docs/decisions.md) for the reasons behind them.

```sh
brew install pnpm
pnpm install
pnpm e2e:install                  # test browsers, once
pnpm --filter einkaufsliste dev   # dev server for one app
pnpm check                        # typecheck, lint, format, unit tests
pnpm e2e                          # build, then browser tests
pnpm build                        # builds release/index.html and release/<app>.html
```

The pipeline `CD - Release` uploads the app files to a Google Drive folder after each successful test run on `main`. You can share this folder with other people. To set it up, run `pnpm setup:google-drive` once in the repository root folder. See "CD - Release" in [AGENTS.md](AGENTS.md) for the prerequisites, the check and the undo steps.

## Apps

| App           | Data file | Internet | Description                      |
| ------------- | --------- | -------- | -------------------------------- |
| zinsrechner   | no        | no       | Compound interest for a capital. |
| einkaufsliste | yes       | no       | A simple shopping list.          |
