# AGENTS.md

## Purpose

pocket-apps is a monorepo of small personal apps ("home-cooked software").
Each app builds into **one self-contained HTML file**. GitHub Pages serves the files: users open the apps at `https://johschmidt42.github.io/pocket-apps/`. There is no server for user data.
Apps that keep data store it in a **data folder**: a folder on the user's computer (Chrome and Edge) or the app folder in the user's OneDrive or Dropbox (all browsers, also on a phone). The user picks the storage once. Each app has its own JSON file in it. No user data goes to a server of ours.
Most apps use no online services. An app that needs an external API declares this in its `package.json`.

## Terms

- **App file:** the built HTML file of one app, for example `release/app-ideen.html`.
- **Launcher:** the start page `release/index.html`. It shows a card for each app, with the version and icons for the data file, the internet and the AI (see `launcher/src/app-card.tsx`). It is also the place to pick the storage. With a folder, the user can change the order of the apps and mark favorites. The launcher keeps them in `launcher/launcher.json` in the data folder. The code is in `launcher/`.
- **Back link:** the link "Alle Apps" in the header of each app. It opens the launcher.
- **Storage:** where the data folder is. The user picks it once per browser and web address, on the screen "Wo sollen deine Daten liegen?". There are three kinds:
  - `local`: a folder on this computer, for example "Pocket Apps Daten". The apps use the File System Access API. Thus only Chrome and Edge on a computer offer it.
  - `onedrive` and `dropbox` (the cloud storages): the app folder `/Apps/Pocket Apps` in the OneDrive or the Dropbox of the user. All browsers offer them. The user sees the same data on all devices. Later: Google Drive, also in `/Apps/Pocket Apps`.
- **Data folder:** the folder of the storage that holds the app folders: the picked local folder, or `/Apps/Pocket Apps` in a cloud storage. The code calls it `DataFolder`.
- **App folder:** the folder of one app in the data folder: `<app>/`, for example `app-ideen/`. It holds the data file, its backups and the extra files of the app. The store creates it.
- **Data file:** the JSON file of one app in its app folder: `<app>/<app>.json`, for example `app-ideen/app-ideen.json`.
- **AI settings:** the AI provider and the model for all apps, in `ai/ai.json` in the data folder. The API key of the provider is not in this file. It stays in the browser (IndexedDB). See "AI features".
- **Extra file:** another file of an app in its app folder, besides the data file and its backups, for example an image: `lebenslauf/foto-<id>.jpg`.
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
| `pnpm serve`                               | Serve `release/` at `http://localhost:4173/pocket-apps/`.         |
| `pnpm e2e`                                 | Build, then test the files in Chromium.                           |
| `pnpm check:all`                           | `pnpm check` and `pnpm e2e`.                                      |
| `pnpm format`                              | Format all files with Prettier.                                   |
| `cd packages/ui && pnpm shadcn add <name>` | Add a shadcn component to `packages/ui`.                          |

## Layout

Each shared module has JSDoc. The two large modules have a README: read it before you use the module.

```text
apps/<app>/                One app. Vite + React + TypeScript. Builds to dist/index.html.
launcher/                  The launcher. Builds to release/index.html.
packages/core/             Shared code:
  src/app-shell/           AppHeader (back link, title, version, theme switch) and the theme logic.
  src/data-file/           Data folder and data file: pick, load, save, migrate, validate. README.md.
  src/ai/                  AI for all apps: useAi(), the settings dialog and the notices. README.md.
  src/numbers.ts           parseNumber() for German number inputs ("1.234,5").
  src/fetch-json.ts        fetchJson() for apps with "network": true. It never throws.
  src/error-text.ts        errorText(error): the message of an error, as text.
  src/name-dialog.tsx      NameDialog: asks for the name of a new item, or a new name (rename).
  src/file-button.tsx      FileButton: opens the file dialog of the system, gives the picked file.
  src/camera-button.tsx    CameraButton: opens the camera on the back of a phone. Only on touch screens.
  src/folder-button.tsx    FolderButton: opens the folder dialog, gives all files of the folder (read
                           only, not remembered, not related to the data folder).
  src/one-of.ts            isOneOf(list, value): narrows a string to one of the list items.
  src/use-width.ts         useWidth(ref): the width of an element in pixels. 0 in jsdom.
  src/sub-page.ts          useSubPage(): one sub-page of the app in the browser history.
  src/testing.ts           testAppInfo() for unit tests.
packages/ui/               UI components (vendor code) and the Tailwind theme (globals.css).
  src/charts.ts            The Recharts parts for apps (own code, not vendor code).
  src/day-picker.ts        The calendar DayPicker (react-day-picker) for apps (own code).
  src/drag-sort.ts         useDragSort(), moveTo(), moveById(): drag and drop to sort a list (own code).
  src/drag-handle.tsx      DragHandle: the grip at the left of a row (own code).
  src/sort-hint.tsx        SortHint: the screen reader hint for the grips. Once per page (own code).
packages/vite-config/      Shared Vite config. Reads app info and pocket-apps.config.json.
pocket-apps.config.json    Settings for all apps, for example the back link.
scripts/build-release.mjs  Copies the built files to release/.
scripts/serve-release.mjs  Serves release/ at http://localhost:4173/pocket-apps/ (`pnpm serve`).
e2e/                       Browser tests (Playwright) for the files in release/.
.github/                   GitHub Actions: pipelines in workflows/, shared setup in actions/setup/.
docs/decisions.md          Why we chose the tools and patterns.
```

Import boundaries (ESLint enforces them in `apps/` and `launcher/`):

- Import only from `packages/*`. Never import from another app.
- Use UI components only from `@pocket-apps/ui`. Never import a component library directly.
- Access data only through `@pocket-apps/core/data-file`. Never use `localStorage`, `sessionStorage`, IndexedDB or the folder and file dialogs directly. The AI settings and the AI key are the only exception: `@pocket-apps/core/ai` keeps them.

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
| `pocketApp.connect`  | `["https://api.x.org"]`  | Optional. The origins of the external APIs. See "Internet access".     |
| `pocketApp.ai`       | `true`                   | Optional. `true` if the app has AI features. See "AI features".        |
| `pocketApp.backLink` | `false`                  | Optional. `false` turns the back link off for this app.                |

- The build validates `package.json` and `pocket-apps.config.json` with zod. A wrong or missing field stops the build with a message.
- The build makes this info available as `__POCKET_APP__`. Do not write the title or the version by hand anywhere else.
- The build also writes the title into `<title>`. It writes name and version into the meta tags `pocket-app-name` and `pocket-app-version`.
- The build writes a Content Security Policy as the first tag in `<head>`: `connect-src 'self'`, the origins in `pocketApp.connect`, with `"ai": true` the AI providers, and with `"stateful": true` the cloud storages (`STORAGE_ORIGINS` in `packages/vite-config`). The page code can call only these addresses.
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

- Set `pocketApp.network` to `true` only if the app needs an external API. List the origin of each API in `pocketApp.connect`, for example `"https://openholidaysapi.org"`. The Content Security Policy blocks all other addresses. An app with `"network": false` has no `connect` list. The dev server has no policy: a blocked address shows only in the built file (`pnpm build`, `pnpm serve`).
- In apps with `"network": false` (and in the launcher, if it has `"network": false`), ESLint forbids `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `@pocket-apps/core/fetch-json`.
- `pocketApp.network` is about the app, not about the storage. An app with `"network": false` can keep its data in a cloud storage: `packages/core` sends these requests.
- For JSON requests, use `fetchJson(url)` from `@pocket-apps/core/fetch-json`. Validate its `json` with zod. Give `App` the optional prop `fetchJson` (type `FetchJson`), so that unit tests can give a fake. See `apps/schuljahr/src/app.tsx`.
- An app with `"network": true` must start without internet. Catch each failed request. Show a clear German message. Do not log the failure with `console.error`.
- Use only APIs that allow requests from the origin `https://johschmidt42.github.io` (CORS). Test the API from that origin before you build the app.
- Keep settings such as a city in the data file. Then the app is stateful. Do not use `localStorage`.
- Never put an API key or a password into the code. Everyone who has the app file can read it. If an API needs a key, the user types it in. A stateful app can keep the key of its own API in its data file (for example the Alpha Vantage key in `kursverlauf`). Keys for AI are different: see "AI features".
- Send to an API only the data that the request needs, for example a city name for a weather API. Do not send the content of the data file. For the AI, see "AI features".

### AI features

Read `packages/core/src/ai/README.md` before you write or change an AI feature. This section has only the rules. The README shows how to use `useAi()`, conversations, images, the cost and the tests. A full example is `apps/trainingsbuch/src/ai-entry-dialog.tsx`.

- Set `"ai": true` in `pocketApp`. The app also needs `"stateful": true` and `"network": true`. The build adds the AI providers to the Content Security Policy. An app that calls only these providers needs no `connect` list.
- Use only `@pocket-apps/core/ai` for AI requests. It calls the providers with their official SDKs, not with `fetchJson`.
- Never write an API key into a data file. The key stays in the browser.
- Send to the AI only the data that the feature needs. Show `AiDataNotice` next to the button that starts the request.
- While a request runs, show a spinner and a button "Abbrechen". It aborts the `signal` of the request.
- After a request, show the cost with `AiUsageSummary`. In a chat, show one summary for all rounds.
- Make the root of the answer schema a `z.object()`. Use `.nullable()`, not `.optional()`, for a field that can be empty: OpenAI needs every field in the answer.
- For an answer of different kinds, use a `status` field and nullable fields, for example `{ status: z.enum(["question", "draft"]), question: z.string().nullable(), draft: draftSchema.nullable() }`. Do not use `z.union()` or `z.discriminatedUnion()`: not all forms of a JSON schema union work with both providers. The app then checks the fields itself.
- Give `App` the optional prop `ask` (type `AskAi`) and pass it to `useAi(ask)`. Then unit tests need no key and no network.

### UI

- Take UI components only from `packages/ui`. Today these are shadcn components.
- For charts, use `ChartContainer` from `@pocket-apps/ui/components/chart` and the chart parts from `@pocket-apps/ui/charts` (Recharts). ESLint forbids a direct import of `recharts` in `apps/` and `launcher/`. If you need a Recharts part that `packages/ui/src/charts.ts` does not export, add it to the export list there.
- Give each category or series one fixed chart color: `--chart-1` to `--chart-8`, in this order of the categories, not of the values. The color stays the same in all tabs and filters. Use `--chart-other` (gray) for "Sonstiges". If there are more than 8 categories, put the rest into "Sonstiges". Do not invent more colors.
- Give the color to an SVG attribute, for example `fill="var(--chart-1)"`, or to the `color` field of a `ChartConfig`. This is not inline `style`. For HTML elements, use the classes `bg-chart-1` and so on.
- Show the values of a chart as text too: labels, a legend or a list. A tooltip alone is not enough, because it shows only on hover. Some colors have less than 3:1 contrast in light mode.
- For a calendar, use `DayPicker` from `@pocket-apps/ui/day-picker` (react-day-picker). Give it Tailwind classes through `classNames`. ESLint forbids a direct import of `react-day-picker`. Do not add the shadcn component `calendar`: it does not pass the typecheck. See `apps/schuljahr/src/year-calendar.tsx`.
- For a select box, use `NativeSelect` from `@pocket-apps/ui/components/native-select`. It works with the keyboard, on phones and in jsdom tests. For a choice among icons, use `ToggleGroup`, because a native select cannot show icons.
- You can add components from another library to `packages/ui`. Add a decision entry first. Use one library per kind of component.
- Do not change vendor components. Change the look only through the theme variables in `globals.css`.
- Do not write your own UI primitives (button, input, dialog and similar).
- You can split a screen into several files. Each file holds one component that combines components from `packages/ui`.
- When two or more apps need the same combination, move it to `packages/ui` or `packages/core`.
- Style only with Tailwind classes. Do not add CSS files to apps. Do not use inline `style`, CSS-in-JS or `@apply`.
- Exception to "Do not add CSS files to apps": a document that an app shows in an `<iframe>`, for example a CV design in `lebenslauf`. Any app can use this pattern. Put the CSS file in the folder `src/designs/` (ESLint allows the import only there) and import it there as text with the Vite suffix `?inline` (`./<name>.css?inline`). The frame can also write CSS rules with computed values (for example the zoom and the page breaks of the preview) as text into a `<style>` element of the frame document. Only the frame document gets this CSS. For the UI of the app, "no inline `style`, no CSS-in-JS" still applies, and the UI around the frame uses Tailwind. See `apps/lebenslauf/src/cv-frame.tsx` and the decision "CV designs with own CSS in an iframe".
- Use theme colors (`bg-background`, `text-muted-foreground`). Do not use raw colors like `text-gray-500`. Then dark mode works without extra classes.
- Write full class names. Never build class names from strings (`` `text-${size}` ``).
- Use icons only from `lucide-react`.
- Show the hand cursor on everything that the user can click. `globals.css` gives it to each `button`, `select` and `[role="button"]` that is not disabled. Give other clickable elements the class `cursor-pointer`, for example a `<label>` that switches a checkbox. A drag handle gets `cursor-grab active:cursor-grabbing`.
- To let the user change the order of a list, use drag and drop with a grip at the left of each row: `useDragSort()`, `DragHandle` and `SortHint` from `packages/ui`. Do not use up/down buttons. See `apps/app-ideen/src/idea-list-view.tsx` and `launcher/src/order-editor.tsx`.
- When a click shows a sub-page of the app with a button back to the main page (for example the detail of one item), use `useSubPage()` from `@pocket-apps/core/sub-page`. Then the back button of the browser closes the sub-page, and a reload shows it again. Read its JSDoc first.
- Only a sub-page adds an entry to the browser history. Tabs, filters, a selected item in a list and dialogs do not.
- For a file dialog, use `FileButton` or `FolderButton` from `packages/core`. Apps use no own `<input type="file">`.
- To take a photo, show `CameraButton` ("Foto aufnehmen") next to a `FileButton` ("Foto wählen"). `CameraButton` shows only on phones and tablets. See `apps/trainingsbuch/src/ai-entry-dialog.tsx`.
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

## Versions

There are two version numbers:

- **App version:** two numbers, `major.minor`, for example `1.0` or `2.3`. The header and the launcher show it. The meta tag `pocket-app-version` contains it. The store writes it into the envelope as `savedWith`.
- **Schema version:** the version of the data shape. Do not write it by hand. It is `1 + migrations.length`. The store writes it into the envelope as `schemaVersion`.

Rules for the app version:

- A new app starts at `1.0`.
- Big change: increase the first number and set the second to 0 (`1.4` → `2.0`). A big change is a new data shape (migration) or a change that the user clearly notices, for example a new screen.
- Small change or fix: increase the second number (`1.0` → `1.1`). Examples: one new button, a text change, a bug fix.
- Before the first version of an app is on GitHub Pages, the app stays at `1.0`.
- There is no third number for users. npm needs three parts, so `package.json` has `"1.0.0"`. The third part is always `0`. The build shows `1.0` and stops if the third part is not `0`.

The app file name has no version (`app-ideen.html`). A new file replaces the old file. Links stay the same.

## Data files and migrations

Read `packages/core/src/data-file/README.md` before you write or change a stateful app. It shows how to use the store, what the user sees, how a migration runs and how to test with the memory folder.

- A stateful app defines its data in `src/schema.ts` with `defineDataSchema()`. See `apps/app-ideen/src/schema.ts`.
- Data files are JSON. Use SQLite (sql.js) only when an app needs queries that are hard with JSON. See `docs/decisions.md`.

### Change the data shape

Use a migration as soon as a version with the old shape is on GitHub Pages. Before that, you can change schema version 1 freely. If you do not know whether that version was published, ask the user.

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
- `packages/core` must have 100 % coverage per file: lines, branches, functions and statements.
- `apps/*/src/schema.ts` and `apps/*/src/migrations/` must have 100 % coverage.
- All other code must have 95 % line coverage and 90 % branch coverage.
- Test from the user's view. Query by role and label (`getByRole`, `getByLabelText`). Use `userEvent`, not `fireEvent`. Do not use snapshots.
- Do not mock internals. For data files, use the memory folder from `@pocket-apps/core/data-file/testing` (see the README of `data-file`).
- Do not use fake timers. Wait with `findBy…` queries.
- For app info in unit tests, use `testAppInfo()` from `@pocket-apps/core/testing`.
- jsdom has no layout. Recharts measures its container with `getBoundingClientRect()` and draws nothing at 0 px. In a unit test of a chart, give elements a size with `vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")`. Return all fields of a `DOMRect`, for example `width: 640` and `height: 400`. See `apps/fixkosten/src/app.test.tsx`. This replaces a browser API, not an internal of our code, so it is allowed. `vitest.setup.ts` restores all mocks after each test, removes the hash of the URL and gives jsdom an empty `ResizeObserver`.
- Keep pure logic (calculations, list operations) in `.ts` files with their own unit tests.

Browser tests:

- The browser tests use the local web server of `pnpm serve`. Playwright starts it.
- The browser tests run only in Chromium. Edge uses the same engine. We do not support other browsers.
- `e2e/all-apps.spec.ts` tests every app automatically: start without network, no errors, title and version, Tailwind styles, theme switch, back link, narrow window. It blocks all network requests to other servers. An app with `"network": true` may try requests, but it must start without errors.
- `e2e/launcher.spec.ts` tests the launcher.
- Add `e2e/<app>.spec.ts` for the main flow of a stateful app: pick the folder, change, save, reload. See `e2e/app-ideen.spec.ts`.
- Use the helpers in `e2e/helpers.ts`. `withDataFolder(page)` before `page.goto()` gives a data folder in the private file system of the browser (OPFS). `withoutFolderAccess(page)` acts like Firefox or Safari: the app offers only the cloud storages. `e2e/onedrive.spec.ts` and `e2e/dropbox.spec.ts` fake the login and the API of the provider with `page.route()`. `writeDataFile()` and `readDataFile()` change and read files in the folder after `page.goto()`.
- In browser tests of a sub-page, use `page.goBack()` and `page.goForward()`.
- The browser tests have no internet. Answer the requests to an API or an AI provider with `page.route()`. See `e2e/kursverlauf.spec.ts` and `e2e/launcher.spec.ts`.

## Add a new app

1. Copy `apps/zinsrechner` (stateless) or `apps/app-ideen` (stateful) to `apps/<name>`.
2. Delete the app logic, the components and the tests of the old app. Keep `index.html`, `vite.config.ts`, `tsconfig.json` and `src/main.tsx` (it only calls `mountApp(App)`).
3. In `package.json`, set `name`, `version` (`"1.0.0"`), `description` and `pocketApp` (`title`, `emoji`, `stateful`, `network`). Add `connect` for an external API and `ai` for AI features.
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
| `CD - Release`   | `cd-release.yml`   | Publish `release/` on GitHub Pages              |

The CI pipelines run on each push to `main` and on each pull request. When `CI - E2E` fails, it uploads the Playwright report as the artifact `playwright-report`. When it passes, it uploads `release/` as the artifact `release`.

### CD - Release

`CD - Release` publishes the app files on GitHub Pages:

1. It starts when `CI - E2E` passed after a push to `main` of this repository. Pull requests and forks never start it.
2. It checks that the commit is still the newest commit on `main`, and that all five CI pipelines passed for it. Else it stops. Thus a re-run of an old run cannot overwrite newer files.
3. It downloads the artifact `release` of that run. It does not build again. Thus it publishes exactly the tested files.
4. It publishes the folder on GitHub Pages: `release/index.html` (the launcher) is `https://johschmidt42.github.io/pocket-apps/`, each app is `…/pocket-apps/<app>.html`.

Repository settings: Settings → Pages → Source must be "GitHub Actions". The pipeline needs no secrets.

To check: `gh run list --workflow "CD - Release" --limit 3`. To publish again, run the newest `CI - E2E` run on `main` again (Actions → CI - E2E → Re-run).

## Definition of done

The checks depend on the size of the change:

| Change        | Example                                   | Checks                                                       |
| ------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Small (x.1)   | A text, a bug fix, one button             | A test for the fix. `pnpm check` passes. CI runs `pnpm e2e`. |
| Feature (x.0) | A new dialog, a new AI feature, a new app | `pnpm check:all` passes. Look at the UI in Chrome.           |
| New pattern   | A new library, new behavior in `core`     | As a feature. Also a decision entry in `docs/decisions.md`.  |

- A small change to the layout or the styles also needs a look at the UI in Chrome.
- `CD - Release` publishes only after all CI pipelines pass. Thus a small change cannot reach GitHub Pages without the browser tests.
- To look at the UI, run `pnpm build` and `pnpm serve`. Open `http://localhost:4173/pocket-apps/` in Chrome. Look at the apps in light and dark mode.
- For changes to a stateful app or to `packages/core/src/data-file/`, also test with a real folder in Chrome: pick a folder, change data, reload, and look at the file. For changes to the storage, also test with OneDrive at `http://localhost:4173/pocket-apps/` (`pnpm serve`).
