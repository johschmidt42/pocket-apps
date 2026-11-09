# pocket-apps

[![CI - Lint](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-lint.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-lint.yml)
[![CI - Format](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-format.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-format.yml)
[![CI - Typecheck](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-typecheck.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-typecheck.yml)
[![CI - Test](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-test.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-test.yml)
[![CI - E2E](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-e2e.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-e2e.yml)
[![CD - Release](https://github.com/johschmidt42/pocket-apps/actions/workflows/cd-release.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/cd-release.yml)

Small personal apps for Chrome and Edge on a computer. Open them at **https://johschmidt42.github.io/pocket-apps/**. Each app is one HTML file. Your data stays on your computer.

## For users

### Start an app

1. Open https://johschmidt42.github.io/pocket-apps/ in Chrome or Edge. The page shows all apps.
2. Click an app card. The app opens.
3. Click "Alle Apps" in the header to go back.

Each card shows the app version (for example `1.0`) and two icons. Move the mouse over an icon to see what it means:

- Disk icon: the app keeps your data in a file. A crossed-out disk: the app keeps nothing.
- Globe: the app needs the internet. A crossed-out Wi-Fi symbol: the app works without internet.

The header shows the app version, for example `1.0`. The moon button switches to dark mode. The sun button switches back to light mode.

### Keep your data

Some apps keep data, for example a list of ideas. These apps ask you to create or open a data file (`.json`).

- Keep the data file in a safe place, for example in your own OneDrive or Google Drive folder.
- Use one data file in one browser tab at a time. Two open tabs can overwrite each other's changes.
- **Chrome and Edge** save changes into your data file automatically. The header bar shows "Gespeichert".
- **Firefox and Safari** cannot write into a file. Click "Speichern" to download the new version.

For Firefox and Safari, set the browser to ask where to save each download:

- Firefox: Settings → General → Downloads → "Always ask you where to save files".
- Safari: Settings → General → "File download location" → "Ask for each download".

Then select your old data file in the save dialog. Confirm that you want to replace it. Without this setting, the browser saves a new file in your download folder, for example `app-ideen (1).json`. Then open that new file next time.

### Updates

- New app versions are online at once. Reload the page to get them. You do not have to do anything else.
- A new app version can change the data format. Then the app downloads a copy of your old data file before it changes anything. The copy has a name like `app-ideen.backup-v1.json`. The number is the old data format, not the app version.
- An old app version cannot open data from a newer version. It shows an error. Reload the page to get the newest version.

## For developers

Read [AGENTS.md](AGENTS.md) for commands, layout and rules. Read [docs/decisions.md](docs/decisions.md) for the reasons behind them.

```sh
nvm install && nvm use            # Node.js 24 from .nvmrc
brew install pnpm
pnpm install
pnpm e2e:install                  # test browsers, once
pnpm --filter app-ideen dev       # dev server for one app
pnpm check                        # typecheck, lint, format, unit tests
pnpm e2e                          # build, then browser tests
pnpm build                        # builds release/index.html and release/<app>.html
```

The pipeline `CD - Release` publishes the app files on GitHub Pages after each successful test run on `main`. See "CD - Release" in [AGENTS.md](AGENTS.md).

## Apps

| App         | Data file | Internet | Description                      |
| ----------- | --------- | -------- | -------------------------------- |
| zinsrechner | no        | no       | Compound interest for a capital. |
| app-ideen   | yes       | no       | Collects ideas for new apps.     |
