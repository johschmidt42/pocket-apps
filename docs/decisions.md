# Decisions

Short records of why we chose a tool or a pattern. Newest first.
Read the related entry before you change a decision. Add an entry for each new decision.

## 2026-11-09: Versions with two numbers, icons on the launcher

- **Decision:** App versions have two numbers, `major.minor`. Apps start at `1.0`. A big change increases the first number. A small change or fix increases the second.
- **Detail:** npm needs three parts. `package.json` has `"1.0.0"`, and the third part is always `0`. The build shows `1.0` and validates the format.
- **Decision:** The launcher shows the version without the word "Version". It shows data file and internet access as icons with a tooltip. Screen readers read the full text.

## 2026-11-09: Apps declare internet access

- **Decision:** Each app declares `pocketApp.network` (`true` or `false`) in its `package.json`. The launcher shows "Braucht Internet" or "Offline" on each card.
- **Enforcement:** In apps with `"network": false`, ESLint forbids `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`. `eslint.config.js` reads the flag of each app with `listApps()`.
- **Why:** Users must see which apps work offline. The label must not be wrong, so a tool checks it.
- **Rule:** No API keys or passwords in the code. Everyone who has the app file can read it.

## 2026-11-09: Fixes after the first code review

- **No automatic save after a migration.** The backup is a download that the app cannot confirm. Thus the app waits for the user to click "Speichern" after a migration. It shows a notice about the backup.
- **Write access at open (Chrome, Edge).** The app asks for write access right after the user opens a file. If an automatic save still fails, the status shows "Nicht gespeichert". The user then saves with the button.
- **Later release of download memory.** The app frees the memory of a download 1 second after the click. Some browsers start the download late.
- **Validated config.** The build validates `package.json` and `pocket-apps.config.json` with zod.
- **Not changed:** The app ID is in `schema.ts` and in `package.json`. Two tabs with the same data file can overwrite each other (see README).
- **Checked:** The theme choice stays when the user goes from the launcher to an app. A browser test checks this in Chromium, Firefox and WebKit.

## 2026-11-09: Launcher app and back link

- **Decision:** The start page `release/index.html` is a small app in `launcher/`. It uses the same header, theme and components as the apps. It shows a card and a search for all apps.
- **Decision:** Each app has a back link "Alle Apps" to the launcher. `pocket-apps.config.json` turns it on or off for all apps. `pocketApp.backLink: false` turns it off for one app.
- **Why:** The shared folder needs a start page that looks good and works offline. Apps and launcher are in the same folder, so the relative link `./index.html` works under `file://`.
- **Why configurable:** An app file can also go out alone, without the launcher. Then the back link would lead nowhere.
- **Replaces:** The plain HTML overview that `scripts/build-release.mjs` wrote before.

## 2026-11-09: One app info object

- **Decision:** The build makes the app info available as one constant `__POCKET_APP__` (name, title, version, description, emoji, stateful, back link). The launcher also gets `__POCKET_APPS__`, the list of all apps.
- **Why:** One object is easier to pass to `AppHeader` and the data file store than single constants.
- **Replaces:** The constants `__APP_NAME__`, `__APP_TITLE__` and `__APP_VERSION__`.

## 2026-11-09: Browser tests with Playwright

- **Decision:** Playwright tests open each app file from `release/` via `file://` in Chromium, Firefox and WebKit. They block all network requests.
- **Why:** Unit tests in jsdom do not see the build, the single-file inlining, missing Tailwind classes or browser differences.
- **Proof:** The first run found a Firefox bug. Firefox sends a `cancel` event before the `change` event of a file selection. The file input fallback now waits 1 second after `cancel` (`CANCEL_GRACE_MS`).
- **Limit:** The tests cannot use the real file pickers of Chrome and Edge. They use a fake File System Access API in the page.

## 2026-11-09: Lint all file types with ESLint

- **Decision:** ESLint also checks JSON (`@eslint/json`), Markdown (`@eslint/markdown`), CSS (`@eslint/css` with `tailwind-csstree`) and HTML (`@html-eslint`).
- **Why:** One tool and one command for all files. Prettier formats all of them.
- **Detail:** The format rules of `@html-eslint` are off, because Prettier does the formatting.

## 2026-11-09: Light mode default with a theme switch

- **Decision:** Light mode is the default. `AppHeader` has a switch for dark mode in every app. The class `dark` on `<html>` selects dark mode.
- **Why:** The user wants light mode first and dark mode always available.
- **Detail:** The browser remembers the choice in `localStorage`. This is only a convenience. Under `file://`, some browsers do not keep it. Then the app starts in light mode again.
- **Replaces:** "Dark mode from the system setting".

## 2026-11-09: Title and version come from package.json

- **Decision:** The build reads `pocketApp.title` and `version` from the app's `package.json`. It sets `<title>`, and the meta tags `pocket-app-name` and `pocket-app-version`. See also "One app info object".
- **Why:** There is one place for each value. Everyone can read the version of an app file, also without opening it.
- **Detail:** The app file name has no version. A new file replaces the old one.

## 2026-11-09: Component libraries in packages/ui

- **Decision:** Apps take all UI components from `packages/ui`. Today these are shadcn components.
- **Why:** shadcn is only one option. Another library is allowed. It must go into `packages/ui` with a decision entry. Use one library per kind of component.

## 2026-11-09: pnpm from Homebrew

- **Decision:** Install pnpm with `brew install pnpm`.
- **Why:** Node comes from nvm. A global npm package belongs to one Node version and is gone after a version change. Corepack 0.32 cannot start pnpm 12. pnpm itself switches to the version in `packageManager`.

## 2026-11-09: Tests with jsdom, not Vitest Browser Mode

- **Decision:** Vitest with jsdom and Testing Library.
- **Why:** It is simple, fast and needs no browser download. The current shadcn components work in jsdom without polyfills.
- **Rejected for now:** Vitest Browser Mode. Vitest recommends it for component tests. Change to it if Radix components need many polyfills in jsdom.
- **Addition:** Playwright tests the built app files in real browsers. See "Browser tests with Playwright".

## 2026-11-09: ESLint and Prettier, TypeScript 6.0

- **Decision:** ESLint (typescript-eslint `strictTypeChecked`, react-hooks, jsx-a11y, testing-library) and Prettier with the Tailwind plugin.
- **Why:** This set enforces the most rules from `AGENTS.md`. Speed is not important in a small repo.
- **Consequence:** typescript-eslint supports TypeScript only up to 6.0. TypeScript 7 (Go port) has no compiler API yet. We pin TypeScript 6.0.x.
- **Workaround:** `eslint-plugin-jsx-a11y` 6.10.2 does not list ESLint 10 as a supported version. The `peerDependencyRules` entry in `pnpm-workspace.yaml` allows it. Remove that entry when the plugin supports ESLint 10.
- **Rejected:** Biome. Its type-aware rules are still experimental.
- **Rejected:** Oxlint. It supports TypeScript 7, but its React Compiler rules need experimental plugins.

## 2026-11-09: sql.js for apps that need SQLite

- **Decision:** If an app needs SQLite, use `sql.js` ≥ 1.15.2 with the inline build `sql.js/dist/sql-wasm-inline.js`.
- **Why:** It loads a database from bytes with one call. It exports the database to bytes with one call. The inline build contains the WebAssembly code in the JavaScript file. Thus it works in one HTML file under `file://`. It is the smallest option (about 440 KB gzip). A test on 2026-11-09 passed in Chromium, WebKit and Firefox.
- **Rejected:** `@sqlite.org/sqlite-wasm`. It is bigger. It needs more code for import and export. It cannot import files in WAL mode. Use `@sqlite.org/sqlite-wasm` only if an app needs full-text search (FTS5).
- **Rejected:** Turso in the browser. It needs a separate worker file.
- **Rule:** JSON stays the default format.

## 2026-11-09: Dark mode from the system setting (replaced)

- **Status:** Replaced by "Light mode default with a theme switch".
- **Decision:** The theme used `@media (prefers-color-scheme: dark)`. There was no theme switch.
- **Why:** No JavaScript is needed. `localStorage` is not reliable under `file://`, so a saved user choice could get lost.

## 2026-11-09: App and data in separate files

- **Decision:** The app is one HTML file. The data is a separate JSON file that the user owns. There is no server, no hosting and no browser storage as the source of truth.
- **Why:** Users can share the app file. Updates replace only the app file. Clearing the browser does not delete data.
- **Consequence:** Chrome and Edge save directly into the file (File System Access API). Firefox and Safari save by download.
- **Consequence:** Phones cannot open a local HTML file reliably. We do not support phones. Layouts must still work in narrow browser windows.
