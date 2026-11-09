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

- Disk icon: the app keeps your data in a file in your data folder. A crossed-out disk: the app keeps nothing.
- Globe: the app uses an online service. A crossed-out Wi-Fi symbol: the app uses no online service and sends no data to the internet.

The header shows the app version, for example `1.0`. The moon button switches to dark mode. The sun button switches back to light mode.

### Keep your data

Some apps keep data, for example a list of ideas. All these apps use one data folder on your computer.

1. Make a folder, for example "Pocket Apps Daten". Put it into your OneDrive or Google Drive folder. Then you have a backup automatically.
2. Open an app that keeps data. Click "Ordner wählen …" and select your folder.
3. Chrome asks if the page can edit the folder. Allow it.

Each app keeps its data in its own file in this folder, for example `app-ideen.json`.

- The apps save each change automatically. The bar under the header shows "Gespeichert".
- When you open an app later, Chrome can ask for access again. Click "Zugriff erlauben". Select "Bei jedem Besuch erlauben". Then Chrome does not ask again.
- Do you have a data file from an older version, for example `app-ideen.json`? Put it into the data folder. The app opens it.
- Use one app in one browser tab at a time. If the file changed somewhere else, for example on another computer, the app does not overwrite it. It asks what to do.

Pocket Apps work only in Chrome and Edge on a computer. Other browsers show a notice.

### Updates

- New app versions are online within about 10 minutes. Reload the page to get them. You do not have to do anything else.
- A new app version can change the data format. Then the app keeps a copy of your old data file in the data folder before it changes anything. The copy has a name like `app-ideen.backup-v1.json`. The number is the old data format, not the app version.
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
pnpm serve                        # serves release/ at http://localhost:4173/pocket-apps/
```

The pipeline `CD - Release` publishes the app files on GitHub Pages after each successful test run on `main`. See "CD - Release" in [AGENTS.md](AGENTS.md).

## Apps

| App         | Data file | Internet | Description                      |
| ----------- | --------- | -------- | -------------------------------- |
| zinsrechner | no        | no       | Compound interest for a capital. |
| app-ideen   | yes       | no       | Collects ideas for new apps.     |
