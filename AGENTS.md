# AGENTS.md

## Purpose

pocket-apps is a monorepo of small personal apps ("home-cooked software").
Each app builds into **one self-contained HTML file**. Users open the file from disk (`file://`). They need no server.
Apps that keep data store it in a **separate JSON file**. The user owns this file. No user data goes to a server.
Most apps work offline. An app that needs an external API declares this in its `package.json`.

## Terms

- **App file:** the built HTML file of one app, for example `release/app-ideen.html`.
- **Launcher:** the start page `release/index.html`. It shows a card for each app. Each card shows the version (`1.0`) and two icons with a tooltip: data file (disk icon "Speichert Daten in einer eigenen Datei" or crossed-out disk "Speichert keine Daten") and internet (globe "Braucht Internet" or crossed-out Wi-Fi "Funktioniert ohne Internet"). The code is in `launcher/`.
- **Back link:** the link "Alle Apps" in the header of each app. It opens the launcher.
- **Data file:** the JSON file with the user's data. The user chooses where it is.
- **Stateful app:** an app with a data file. A stateless app keeps nothing after the tab closes.
- **Envelope:** the outer JSON object of a data file: `{ app, schemaVersion, savedWith, savedAt, data }`. `savedWith` is the app version that wrote the file. `savedAt` is an ISO time. The code calls it `Envelope` (`envelope.ts`).
- **Vendor code:** code that a tool generated and that we do not edit. Here: the components in `packages/ui/src/components/`.

## Language

- UI text is German. Set `<html lang="de">`.
- Code, comments and docs are English.
- Four names are the same lowercase word, without a scope: the folder name, the package name, the `app` field in `schema.ts` and the app file name. Example: `apps/pflanzen`, `"name": "pflanzen"`, `app: "pflanzen"`, `release/pflanzen.html`.

## Commands

Use Node.js 24. The file `.nvmrc` sets the exact version (for example `24.22.2`) for nvm and for the CI. To update Node.js, change only `.nvmrc`. Run `nvm use` in the repository root folder (once: `nvm install`).
Install pnpm once with Homebrew: `brew install pnpm`. pnpm then uses the version in `packageManager` of `package.json`.
Install the test browsers once: `pnpm e2e:install`.

| Command                                    | What it does                                                      |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `pnpm install`                             | Install all dependencies.                                         |
| `pnpm --filter <app> dev`                  | Start the dev server for one app, e.g. `app-ideen` or `launcher`. |
| `pnpm check`                               | Typecheck, lint, format check, unit tests with coverage.          |
| `pnpm build`                               | Build all apps and the launcher into `release/`.                  |
| `pnpm e2e`                                 | Build, then test the files in Chromium, Firefox and WebKit.       |
| `pnpm check:all`                           | `pnpm check` and `pnpm e2e`.                                      |
| `pnpm format`                              | Format all files with Prettier.                                   |
| `cd packages/ui && pnpm shadcn add <name>` | Add a shadcn component to `packages/ui`.                          |

## Layout

```text
apps/<app>/                One app. Vite + React + TypeScript. Builds to dist/index.html.
launcher/                  The launcher. Builds to release/index.html.
packages/core/             Shared code:
  src/app-shell/           AppHeader (back link, title, version, theme switch) and the theme logic.
  src/data-file/           Data file: open, save, migrate, validate.
  src/testing.ts           testAppInfo() for unit tests.
packages/ui/               UI components (vendor code) and the Tailwind theme (globals.css).
packages/vite-config/      Shared Vite config. Reads app info and pocket-apps.config.json.
pocket-apps.config.json    Settings for all apps, for example the back link.
scripts/build-release.mjs  Copies the built files to release/.
e2e/                       Browser tests (Playwright) for the files in release/.
.github/                   GitHub Actions: pipelines in workflows/, shared setup in actions/setup/.
docs/decisions.md          Why we chose the tools and patterns.
```

Import boundaries (ESLint enforces them in `apps/` and `launcher/`):

- Import only from `packages/*`. Never import from another app.
- Use UI components only from `@pocket-apps/ui`. Never import a component library directly.
- Access data only through `@pocket-apps/core/data-file`. Never use `localStorage`, `sessionStorage` or the file pickers directly.

## Rules

Tools enforce most rules: `tsc`, ESLint, Prettier, the Vitest coverage thresholds and the browser tests.
ESLint checks TypeScript, JavaScript, JSON, Markdown, CSS and HTML files.

- **Never weaken a tool config to make a check pass.**
- Add an `eslint-disable` comment only with a reason. Write the reason after `--` on the same line.
- If a rule blocks you, stop and ask the user.
- Before you change a tool or a pattern that has an entry in `docs/decisions.md`, read that entry. Add an entry for each new decision.

### App info and app layout

Each app declares its info in its `package.json`:

| Field                | Example                  | Meaning                                                                |
| -------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `name`               | `"app-ideen"`            | Package name and app file name.                                        |
| `version`            | `"1.0.0"`                | App version `1.0`. The third part is always `0`.                       |
| `description`        | `"Eine einfache Liste."` | German short text for the launcher card.                               |
| `pocketApp.title`    | `"App-Ideen"`            | German display name.                                                   |
| `pocketApp.emoji`    | `"💡"`                   | One emoji as the icon on the launcher card.                            |
| `pocketApp.stateful` | `true`                   | `true` if the app has a data file.                                     |
| `pocketApp.network`  | `false`                  | `true` if the app needs the internet, for example for an external API. |
| `pocketApp.backLink` | `false`                  | Optional. `false` turns the back link off for this app.                |

- The build validates `package.json` and `pocket-apps.config.json` with zod. A wrong or missing field stops the build with a message.
- The build makes this info available as `__POCKET_APP__`. Do not write the title or the version by hand anywhere else.
- The build also writes the title into `<title>`. It writes name and version into the meta tags `pocket-app-name` and `pocket-app-version`.
- Every app shows `AppHeader` from `@pocket-apps/core/app-shell` at the top. It holds the back link, the `<h1>`, the version and the theme switch.
- A stateless app renders `<AppHeader app={__POCKET_APP__} />` itself.
- A stateful app gets the header from `DataFileProvider`. Pass `{ app: __POCKET_APP__ }` to `createDataFileStore()`.
- `main.tsx` contains only `mountApp(App)` from `@pocket-apps/core/app-shell`. `mountApp` loads the styles, applies the saved theme and renders the app.
- Light mode is the default. The theme switch must work in every app.

### Back link

- `backLink` in `pocket-apps.config.json` controls the back link for all apps: `enabled`, `href` and `label`.
- To turn the back link off for one app, add `"backLink": false` to the `pocketApp` object in its `package.json`. Keep the other `pocketApp` fields.
- An app can only turn the back link off. If `enabled` is `false` in the config, no app shows a back link. Apps cannot change `href` or `label`.
- `launcher/package.json` has `"backLink": false` in `pocketApp`.

### Internet access

- Set `pocketApp.network` to `true` only if the app needs an external API.
- In apps with `"network": false` and in the launcher, ESLint forbids `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`.
- An app with `"network": true` must start without internet. Catch each failed request. Show a clear German message. Do not log the failure with `console.error`.
- Use only APIs that allow requests from any origin (`Access-Control-Allow-Origin: *`). An app file under `file://` has the origin `null`. Test the API from a `file://` page before you build the app.
- Keep settings such as a city in the data file. Then the app is stateful. Do not use `localStorage`.
- Never put an API key or a password into the code. Everyone who has the app file can read it. If an API needs a key, the user types it in. A stateful app can keep it in the data file.
- Send to an API only the data that the request needs, for example a city name for a weather API. Do not send the content of the data file.

### UI

- Take UI components only from `packages/ui`. Today these are shadcn components.
- You can add components from another library to `packages/ui`. Add a decision entry first. Use one library per kind of component.
- Do not change vendor components. Change the look only through the theme variables in `globals.css`.
- Do not write your own UI primitives (button, input, dialog and similar).
- You can split a screen into several files. Each file holds one component that combines components from `packages/ui`.
- When two or more apps need the same combination, move it to `packages/ui` or `packages/core`.
- Style only with Tailwind classes. Do not add CSS files to apps. Do not use inline `style`, CSS-in-JS or `@apply`.
- Use theme colors (`bg-background`, `text-muted-foreground`). Do not use raw colors like `text-gray-500`. Then dark mode works without extra classes.
- Write full class names. Never build class names from strings (`` `text-${size}` ``).
- Use icons only from `lucide-react`.
- Make layouts work in narrow windows (320 px). Write classes for small screens first. Add `sm:` and `md:` classes only for larger screens.

### HTML and accessibility

- Use one `<main>` per screen. The only `<h1>` is in `AppHeader`. Start app headings at `<h2>`. Do not skip heading levels.
- Use `<button>` for actions and `<a href>` for navigation. Never put `onClick` on a `<div>`.
- Give every input a `<Label htmlFor>`. Give every icon-only button an `aria-label`.
- Write a form as `<form onSubmit>` with a `type="submit"` button. Then Enter works.

### TypeScript

- Do not use `any`. Data from a file is `unknown`. Validate it with zod before you use it.
- Derive types from zod schemas (`z.infer`). Do not declare a type twice.
- Do not use type assertions (`as X`) or non-null assertions (`!`) in source code. Tests can use them.
- Use `type`, not `interface`. Use string unions, not `enum`.
- Model state variants as discriminated unions. Make every `switch` exhaustive.
- Handle every promise. `await` it or mark it with `void`.
- Use named exports. Only config files use a default export.
- Write file names in kebab-case (`idea-list-view.tsx`).
- Store dates in data files as ISO strings. Use `z.iso.date()` for a day (`"2026-11-09"`). Use `z.iso.datetime()` for a time (`"2026-11-09T14:30:00.000Z"`).

### React

- Compute values from props and state during render. Do not store derived values in state.
- Use effects only to sync with external systems (timers, browser events). Put event logic in event handlers.
- Do not use `useMemo`, `useCallback` or `memo` without a measured problem.
- Use stable IDs from the data as keys. Never use the array index.
- Keep state in `useState`, `useReducer` and `useDataFile()`. Do not add Redux, Zustand or a router.
- Export one component per file.

### Dependencies

- Add a dependency only with a reason. Use browser APIs first.
- Pin exact versions. Do not use `^` or `~`.
- Keep TypeScript on 6.0.x until typescript-eslint supports TypeScript 7.
- Make IDs with `crypto.getRandomValues`. Do not use `crypto.randomUUID`. Some browsers block it under `file://`.

## Versions

There are two version numbers:

- **App version:** two numbers, `major.minor`, for example `1.0` or `2.3`. The header and the launcher show it. The meta tag `pocket-app-version` contains it. The store writes it into the envelope as `savedWith`.
- **Schema version:** the version of the data shape. Do not write it by hand. It is `1 + migrations.length`. The store writes it into the envelope as `schemaVersion`.

Rules for the app version:

- A new app starts at `1.0`.
- Big change: increase the first number and set the second to 0 (`1.4` → `2.0`). A big change is a new data shape (migration) or a change that the user clearly notices, for example a new screen.
- Small change or fix: increase the second number (`1.0` → `1.1`). Examples: one new button, a text change, a bug fix.
- Before the first app file is in the shared folder, the app stays at `1.0`.
- There is no third number for users. npm needs three parts, so `package.json` has `"1.0.0"`. The third part is always `0`. The build shows `1.0` and stops if the third part is not `0`.

The app file name has no version (`app-ideen.html`). A new file replaces the old file. Links stay the same.

## Data files and migrations

A stateful app defines its data in `src/schema.ts` with `defineDataSchema()`. It creates the store with `createDataFileStore()`.
Data files are JSON. Use SQLite (sql.js) only when an app needs queries that are hard with JSON. See `docs/decisions.md`.

### How a migration runs

When the user opens a data file, `loadData()` in `packages/core` does these steps:

1. It reads the envelope. It stops with an error if the file is not JSON or has no valid envelope.
2. It compares `app` with the app ID. It stops with an error for a file of another app.
3. It compares the schema version of the file with the schema version of the app. It stops with an error if the file is newer.
4. It runs each missing migration in order, in memory. Example: a file with schema version 1 in an app with schema version 3 runs `migrations[0]` (1 → 2), then `migrations[1]` (2 → 3).
5. It validates the result with the zod schema. It stops with an error if the data does not match.

If step 4 ran a migration, the store then:

1. Downloads the unchanged old file as `<name>.backup-v<old schema version>.json`.
2. Shows the data, marks it as unsaved and shows a notice about the backup.
3. Waits for the user. The app does not save automatically after a migration, also not in Chrome and Edge.
4. Writes the data file when the user clicks "Speichern". After that, automatic saving works again.

Thus the app never changes the data file before the user saw the backup notice.

### Change the data shape

Use a migration as soon as an app file with the old shape is in the shared folder. Before that, you can change schema version 1 freely. If you do not know whether the app is in the shared folder, ask the user.

1. Change the zod schema in `schema.ts`.
2. Add `src/migrations/to-v<N>.ts`. Export one function `toV<N>`. Give it the type `Migration` from `@pocket-apps/core/data-file`. It converts data from schema version N-1 to N.
3. In the migration, define the old shape as a local zod schema. Parse the input with it. Do not import the current schema. Do not use `as`.
4. Give each new field an explicit value. If the value is unknown, make the field nullable, for example `z.iso.date().nullable()`. Then set it to `null` in the migration.
5. Append the function to the `migrations` array in `schema.ts`.
6. Add `src/migrations/to-v<N>.test.ts`. Put an example of the old data in the test as a constant. The test checks the converted data.
7. Never change or remove an old migration or its example data.
8. In `schema.test.ts`, update the test that checks `currentVersion(schema)`.
9. Increase the first number of the app version (big change).

## Testing

- Put unit tests next to the code: `name.test.ts` or `name.test.tsx`.
- `packages/core` must have 100 % coverage per file.
- `apps/*/src/schema.ts` and `apps/*/src/migrations/` must have 100 % coverage.
- All other code must have 95 % line coverage and 90 % branch coverage.
- Test from the user's view. Query by role and label (`getByRole`, `getByLabelText`). Use `userEvent`, not `fireEvent`. Do not use snapshots.
- Do not mock internals. For data files, use `createMemoryFileAccess()` from `@pocket-apps/core/data-file/testing`. Pass it as `fileAccess` to `DataFileProvider`.
- For app info in unit tests, use `testAppInfo()` from `@pocket-apps/core/testing`.
- Keep pure logic (calculations, list operations) in `.ts` files with their own unit tests.
- `e2e/all-apps.spec.ts` tests every app automatically: offline start, no errors, title and version, Tailwind styles, theme switch, back link, narrow window. It blocks all network requests. An app with `"network": true` may try requests, but it must start without errors.
- `e2e/launcher.spec.ts` tests the launcher.
- Add `e2e/<app>.spec.ts` for the main flow of a stateful app: create, change, save, open.

## Add a new app

1. Copy `apps/zinsrechner` (stateless) or `apps/app-ideen` (stateful) to `apps/<name>`.
2. Delete the app logic, the components and the tests of the old app. Keep `index.html`, `vite.config.ts`, `tsconfig.json` and `src/main.tsx` (it only calls `mountApp(App)`).
3. In `package.json`, set `name`, `version` (`"1.0.0"`), `description` and `pocketApp` (`title`, `emoji`, `stateful`, `network`).
4. For a stateful app, set `app` in `schema.ts` to the package name. Start at schema version 1 with no migrations.
5. Run `pnpm install`.
6. Write the app, its unit tests and, for a stateful app, `e2e/<name>.spec.ts`.
7. Run `pnpm check:all`. The launcher shows the new app automatically.
8. Add the app to the table in `README.md`.

A new app needs no decision entry.

## Git commits

Write commit messages in the style of Conventional Commits: `<type>(<scope>): <summary>`.

- Types: `feat` (new feature), `fix` (bug fix), `docs`, `test`, `refactor`, `chore` (tooling, config), `ci` (pipelines), `build` (build setup).
- Dependency updates: `chore(deps): update vite to 8.4.0`.
- Scope: the app or package that the commit changes, for example `app-ideen`, `zinsrechner`, `launcher`, `core`, `ui`, `vite-config`.
- If a commit changes several apps or packages, leave out the scope: `feat: two-part app versions`.
- Write the summary in English, in the imperative, in lower case, without a period: `fix(zinsrechner): read "10.000" as ten thousand`.
- Put details in the body as a short list.

Examples:

```text
feat(app-ideen): add a priority to each idea
fix(core): keep the backup before a migration
ci: add lint pipelines
docs: explain the back link config
```

## CI and CD

GitHub Actions run the pipelines in `.github/workflows/`.

- Name a CI pipeline (checks) `CI - <what>`, for example `CI - Lint`. File name: `ci-<what>.yml`.
- Name a CD pipeline (delivery) `CD - <what>`, for example `CD - Release`. File name: `cd-<what>.yml`.
- Use the local action `./.github/actions/setup` to install Node.js (version from `.nvmrc`), pnpm and the dependencies. Do not repeat these steps.
- Pin every action to a commit hash with the tag as a comment: `actions/checkout@<sha> # v7.0.1`. CI builds the files that CD delivers, so CI needs the same protection.
- In CD pipelines, use only official GitHub actions. CD pipelines have access to secrets.
- Give each pipeline `permissions: contents: read`, unless it needs more.
- Use the same commands as on your computer (`pnpm lint`, `pnpm typecheck`). Do not write special commands for CI.

Current pipelines:

| Pipeline         | File               | Runs                                            |
| ---------------- | ------------------ | ----------------------------------------------- |
| `CI - Lint`      | `ci-lint.yml`      | `pnpm lint`                                     |
| `CI - Format`    | `ci-format.yml`    | `pnpm format:check`                             |
| `CI - Typecheck` | `ci-typecheck.yml` | `pnpm typecheck`                                |
| `CI - Test`      | `ci-test.yml`      | `pnpm coverage`                                 |
| `CI - E2E`       | `ci-e2e.yml`       | `pnpm e2e:install --with-deps`, then `pnpm e2e` |
| `CD - Release`   | `cd-release.yml`   | Upload of `release/*.html` to Google Drive      |

The CI pipelines run on each push to `main` and on each pull request. When `CI - E2E` fails, it uploads the Playwright report as the artifact `playwright-report`. When it passes, it uploads `release/` as the artifact `release`.

### CD - Release

`CD - Release` uploads the app files to a folder in Google Drive:

1. It starts when `CI - E2E` passed after a push to `main` of this repository. Pull requests and forks never start it.
2. It checks that the commit is still the newest commit on `main`, and that all five CI pipelines passed for it. Else it stops. Thus a re-run of an old run cannot overwrite newer files.
3. It downloads the artifact `release` of that run. It does not build again. Thus it uploads exactly the tested files.
4. It runs `rclone sync release/ gdrive: --include "*.html" --checksum`. It compares the MD5 checksums. New app files and app files with a changed content go to the folder. Unchanged files stay as they are, with their date. App files that are no longer in `release/` are deleted. Other files, for example data files (`*.json`), stay.
5. It runs only if the repository variable `GDRIVE_FOLDER_ID` is set. Without the variable, GitHub skips it.

[rclone](https://rclone.org) is a command-line tool that copies files to cloud storage. The pipeline configures its remote `gdrive` only with environment variables. Your computer has the remote `pocket-apps`. Both use the same token.

The token has the Google Drive scope `drive.file`. With this scope, the token can access only the files that rclone created. It cannot see other files in the Drive.

Repository settings (Settings → Secrets and variables → Actions):

| Kind     | Name                   | Value                                                                                 |
| -------- | ---------------------- | ------------------------------------------------------------------------------------- |
| Secret   | `GDRIVE_TOKEN`         | The rclone OAuth token (JSON) of the remote `pocket-apps`.                            |
| Secret   | `GDRIVE_CLIENT_ID`     | The OAuth client ID of your Google Cloud project (type "Desktop app").                |
| Secret   | `GDRIVE_CLIENT_SECRET` | The secret of this OAuth client.                                                      |
| Variable | `GDRIVE_FOLDER_ID`     | The ID of the Drive folder. Set it to turn the pipeline on. Delete it to turn it off. |

#### Google Cloud project (once)

rclone needs an OAuth client of your own Google Cloud project. rclone's shared client stops working in 2026. Do these steps in the [Google Cloud Console](https://console.cloud.google.com). Add `?project=<project-id>` to each link.

1. Enable the Google Drive API: [APIs & Services → Library → Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) → "Enable".
2. Google Auth Platform → "Get started": app name `pocket-apps`, your email as support email, user type "External", your email as contact. Click "Create".
3. Google Auth Platform → [Branding](https://console.cloud.google.com/auth/branding). Google needs these fields before it lets you publish the app:

   | Field                           | Value                                           |
   | ------------------------------- | ----------------------------------------------- |
   | App logo                        | Leave empty. A logo needs a verification.       |
   | Application home page           | A public page, e.g. `https://github.com/<user>` |
   | Application privacy policy link | A public page, e.g. `https://github.com/<user>` |
   | Authorised domains              | The domain of these pages, e.g. `github.com`    |

   Click "Save". Google checks the content of these pages only in a verification. This app needs no verification.

4. Google Auth Platform → [Audience](https://console.cloud.google.com/auth/audience): click "Publish app" and confirm. The status must be "In production". In "Testing", Google ends the login after 7 days.
5. Google Auth Platform → [Data access](https://console.cloud.google.com/auth/scopes): "Add or remove scopes" → add `https://www.googleapis.com/auth/drive.file` → "Update" → "Save". It must show under "Your non-sensitive scopes". Thus Google does not need to verify the app.
6. Google Auth Platform → [Clients](https://console.cloud.google.com/auth/clients/create): create a client of type "Desktop app", name `rclone pocket-apps`. Copy the client ID and the client secret. Google shows the full secret only once.

"Authorised domains" give nobody access to the Drive. They only list the domains that the consent screen can show. Only the token gives access, and only the owner of the Drive can create it with a login.

`drive.file` gives access per OAuth client. A new client cannot see the folder of the old client. The setup script then creates a new folder.

#### Set up

Before you start:

- You have admin rights on the GitHub repository.
- `gh` is logged in (`gh auth status`).
- `rclone` and `jq` are installed (`brew install rclone jq`).
- You have the client ID and the client secret (see above).
- You ran `pnpm install`.

Run this in the repository root folder:

```sh
pnpm setup:google-drive                  # creates the folder "Pocket Apps"
pnpm setup:google-drive "Meine Apps"     # or with another folder name
```

The script does these steps:

1. It asks for the client ID and the client secret (or reads `GDRIVE_CLIENT_ID` and `GDRIVE_CLIENT_SECRET` from the environment).
2. It creates the rclone remote `pocket-apps` with scope `drive.file` and your client. Your browser opens. Log in with the Google account that must own the folder. The consent screen shows `pocket-apps`. Allow the access.
   - If Google shows "Google hasn't verified this app": click "Advanced" → "Go to pocket-apps (unsafe)". This is correct for your own app.
   - If rclone asks "Token already configured - replace it?": answer `y`.
   - If rclone asks "Use web browser to automatically authenticate?": answer `y`.
   - If rclone asks "Configure this as a Shared Drive (Team Drive)?": answer `n`.
3. It checks that the remote has the scope `drive.file`. Else it stops. It creates the folder in "My Drive". With scope `drive.file`, rclone must create the folder itself. If `GDRIVE_FOLDER_ID` is already set and the client did not change, it uses that folder.
4. It writes the token, the client ID and the client secret into the secrets. It does not print them.
5. It writes the folder ID into the variable `GDRIVE_FOLDER_ID`.

After the setup, you can move, rename and share the folder in Google Drive. The ID stays the same. You can run the script again at any time, for example after you removed the access. It keeps the folder.

#### Check

```sh
gh run list --workflow "CD - Release" --limit 3
```

To upload now, run the newest `CI - E2E` run on `main` again (Actions → CI - E2E → Re-run). The script prints the exact command. The artifact `release` exists for 7 days. After that, push a new commit.

If `CD - Release` fails with `invalid_grant`, Google ended the login. This happens when you removed the access, or when nobody used the token for 6 months. Run `pnpm setup:google-drive` again. It keeps the folder.

#### Turn off and undo

- Pause the uploads: `gh variable delete GDRIVE_FOLDER_ID`. A new setup then uses the folder with the same name again, if it still exists. Else it creates a new folder.
- Remove the secrets from GitHub: `gh secret delete GDRIVE_TOKEN`, `gh secret delete GDRIVE_CLIENT_ID`, `gh secret delete GDRIVE_CLIENT_SECRET`.
- Remove the token from your computer: `rclone config delete pocket-apps`. The file `~/.config/rclone/rclone.conf` holds the token without encryption.
- Stop the Google access at once: remove "pocket-apps" at [myaccount.google.com/permissions](https://myaccount.google.com/permissions). Or delete the OAuth client in the Google Cloud Console.
- The folder and the app files stay in Google Drive. Delete them there if necessary.

## Definition of done

- `pnpm check:all` passes.
- For UI changes, open the files from `release/` in a browser. Look at them in light and dark mode.
