# AGENTS.md

## Purpose

pocket-apps is a monorepo of small personal apps ("home-cooked software").
Each app builds into **one self-contained HTML file**. GitHub Pages serves the files: users open the apps at `https://johschmidt42.github.io/pocket-apps/` in Chrome or Edge. There is no server for user data.
Apps that keep data store it in a **data folder** on the user's computer. The user picks this folder once. Each app has its own JSON file in it. No user data goes to a server.
Most apps use no online services. An app that needs an external API declares this in its `package.json`.

## Terms

- **App file:** the built HTML file of one app, for example `release/app-ideen.html`.
- **Launcher:** the start page `release/index.html`. It shows a card for each app. Each card shows the version (`1.0`) and two icons with a tooltip: data file (disk icon "Speichert Daten in einer eigenen Datei" or crossed-out disk "Speichert keine Daten") and online services (globe "Nutzt Online-Dienste" or crossed-out Wi-Fi "Nutzt keine Online-Dienste"). An app with AI features has a third icon: sparkles "Nutzt KI mit deinem API-Key". The code is in `launcher/`. The launcher is also the place to pick the data folder. With a folder, the user can change the order of the apps ("Reihenfolge ändern") and mark apps as favorites (star button on the card). If there are favorites, the launcher shows them first, under "Favoriten", and the other apps under "Weitere Apps". Both sections use the one order of all apps. The launcher keeps the order and the favorites in `launcher/launcher.json` in the data folder. Without a folder, it shows the apps in the build order, with no star buttons and no sections.
- **Back link:** the link "Alle Apps" in the header of each app. It opens the launcher.
- **Data folder:** the folder that the user picks once, for example "Pocket Apps Daten". It can be in a OneDrive or Google Drive folder. The apps use the File System Access API. Thus only Chrome and Edge on a computer can use it.
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

```text
apps/<app>/                One app. Vite + React + TypeScript. Builds to dist/index.html.
launcher/                  The launcher. Builds to release/index.html.
packages/core/             Shared code:
  src/app-shell/           AppHeader (back link, title, version, theme switch) and the theme logic.
  src/data-file/           Data folder and data file: pick, load, save, migrate, validate.
  src/numbers.ts           parseNumber() for German number inputs ("1.234,5").
  src/ai/                  AI for all apps: useAi() sends requests, AiSettingsDialog, AiSetupNotice,
                           AiDataNotice.
  src/fetch-json.ts        fetchJson() for apps with "network": true. It never throws.
  src/error-text.ts        errorText(error): the message of an error, as text.
  src/name-dialog.tsx      NameDialog: asks for the name of a new item, or a new name for an item (rename).
  src/file-button.tsx      FileButton: a button that opens the file dialog of the system and gives the
                           picked file to the app (for example a photo). Apps use no own
                           `<input type="file">`.
  src/folder-button.tsx    FolderButton: a button that opens the folder dialog of the system and gives
                           all files of the picked folder and its subfolders to the app. The app can
                           only read these files. The browser does not remember the folder. This
                           folder has no relation to the data folder.
  src/one-of.ts            isOneOf(list, value): true if the string value is in the list. Then TypeScript
                           knows that value is one of the list items.
  src/use-width.ts         useWidth(ref): the width of an element in pixels. 0 in jsdom.
  src/testing.ts           testAppInfo() for unit tests.
packages/ui/               UI components (vendor code) and the Tailwind theme (globals.css).
  src/charts.ts            The Recharts parts for apps (own code, not vendor code).
  src/day-picker.ts        The calendar DayPicker (react-day-picker) for apps (own code, not vendor code).
  src/drag-sort.ts         useDragSort(): drag and drop to change the order of a list. The arrow keys
                           up and down on the focused grip move a row one place. Two list functions
                           for its callbacks: moveTo(list, id, targetId, "before" | "after") for a
                           drop, moveById(list, id, -1 | 1) for an arrow key (own code).
  src/drag-handle.tsx      DragHandle: the grip at the left of a row (own code).
  src/sort-hint.tsx        SortHint: a text that only screen readers read: how to move a row. Each
                           grip points to it by its ID. Render it once per page: two copies would
                           have the same ID (own code).
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
- Access data only through `@pocket-apps/core/data-file`. Never use `localStorage`, `sessionStorage`, IndexedDB or the folder and file dialogs directly.

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
- The build writes a Content Security Policy as the first tag in `<head>`: `connect-src 'self'`, the origins in `pocketApp.connect` and, with `"ai": true`, the AI providers. The page code can call only these addresses.
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
- For JSON requests, use `fetchJson(url)` from `@pocket-apps/core/fetch-json`. It never throws. It returns `{ kind: "ok", json }` with `json` as `unknown`, or a failure: `offline`, `http-error` (with `status`) or `bad-body` (the answer is not JSON). Validate `json` with zod. Give `App` the optional prop `fetchJson` (type `FetchJson`), so that unit tests can give a fake. See `apps/schuljahr/src/app.tsx`.
- An app with `"network": true` must start without internet. Catch each failed request. Show a clear German message. Do not log the failure with `console.error`.
- Use only APIs that allow requests from the origin `https://johschmidt42.github.io` (CORS). Test the API from that origin before you build the app.
- Keep settings such as a city in the data file. Then the app is stateful. Do not use `localStorage`.
- Never put an API key or a password into the code. Everyone who has the app file can read it. If an API needs a key, the user types it in. A stateful app can keep the key of its own API in its data file (for example the Alpha Vantage key in `kursverlauf`). Keys for AI are different: see "AI features".
- Send to an API only the data that the request needs, for example a city name for a weather API. Do not send the content of the data file.

### AI features

- Set `"ai": true` in `pocketApp`. The app also needs `"stateful": true` and `"network": true`. The build stops if one is missing. The build adds the AI providers (`https://api.anthropic.com`, `https://api.openai.com`) to the Content Security Policy. An app that calls only these providers needs no `connect` list. The launcher card shows the sparkles icon "Nutzt KI mit deinem API-Key".
- The user sets up the AI once, in the launcher ("KI einrichten") or in an AI app: the provider (Claude or OpenAI), the API key and the model for this provider. "Verbindung prüfen" asks the provider for its list of models. This shows if the key works and fills the model choice. All apps use this setup.
- The provider and the model of each provider are in `ai/ai.json` in the data folder. They sync with the folder. The API key stays in the browser (IndexedDB): the user types it once per browser and per web address. Never write an API key into a data file.
- All names in this section come from `@pocket-apps/core/ai`. In the app, call `useAi()`. Use it only inside `DataFileProvider`. Its `state` has one of these statuses:
  - `loading`: the app reads the AI settings. Show nothing or a short German text such as "Lädt …".
  - `not-set-up`: the user set up no AI, or this browser has no key. Show `<AiSetupNotice feature="liest deine Notizen" onClose={reload} />`. `feature` is the German verb phrase after "Die KI …": the notice shows "Die KI liest deine Notizen. Dafür brauchst du einen eigenen API-Key …" and the button "KI einrichten". `onClose` runs when the dialog closes. `reload` then reads the settings again.
  - `error`: the app cannot read the AI settings, for example because `ai/ai.json` is broken. Show `state.message`.
  - `ready`: `state.ask(request)` sends a request. `state.provider` and `state.model` are the choice of the user. To let the user change the provider or the model, the app can show its own button that opens `AiSettingsDialog`. The launcher has the same dialog.

  ```tsx
  const { state, reload } = useAi(ask); // ask: the optional fake of the tests
  if (state.status !== "ready") return; // show the notice for the other statuses
  const result = await state.ask({
    instructions: "…", // the task and the rules for the AI
    messages: [{ role: "user", text: notes, images: [image] }], // images: optional, see imageForAi()
    schema: resultSchema, // a zod schema: the shape of the answer
    signal: controller.signal, // optional: cancels the request
  });
  if (result.kind === "ok")
    use(result.data); // result.data has the type of the schema
  else if (result.kind !== "canceled") show(aiMessage(result)); // a German message
  ```

- For a conversation (for example a question of the AI back to the user), keep the messages in state, with the type `AiMessage[]`. After an answer, add `result.reply` and then the next message of the user, and send all messages again. `result.reply` is the answer as a message of the AI: its `text` is the JSON text of the answer. Do not write messages of the AI yourself. Keep `instructions` and `schema` the same in all rounds.
- An image stays in its message, so it goes to the provider again in each round. The model reads the full conversation in each round. Thus each round costs more than the round before. The provider keeps the start of the conversation in its cache for 5 minutes, if it has enough tokens (Claude Opus 5.5: 512, OpenAI: 1,024). An image has about 300 to 2,500 tokens. In the next round, this part costs only a part of the price. Put an image only into the message where the user added it, so that the start stays the same.
- `result.usage` is the usage of one round. To show the cost of the full conversation, add up the usage of all rounds.
- If a round fails (for example `bad-answer` or `offline`), the messages stay as they were: the failed answer is not in them. Show `aiMessage(result)`, and let the user send the message again.
- Make the root of the schema a `z.object()`. Use `.nullable()`, not `.optional()`, for a field that can be empty: OpenAI needs every field in the answer. For an answer of different kinds, use a `status` field and nullable fields, for example `{ status: z.enum(["question", "draft"]), question: z.string().nullable(), draft: draftSchema.nullable() }`. Do not use `z.union()` or `z.discriminatedUnion()`: not all forms of a JSON schema union work with both providers. The app then checks the fields itself, for example that `draft` is not `null` when `status` is `"draft"`.
- A request can take some seconds. While it runs, show a spinner and a button "Abbrechen" that calls `controller.abort()`. Then `ask()` returns `canceled`. The user started the cancel, so the app shows no message for it.
- `ask()` never throws. It returns `{ kind: "ok", data, reply, usage }` or a failure: `invalid-key`, `no-permission`, `no-credit`, `rate-limit`, `overloaded`, `offline`, `canceled`, `refused` (the AI declined the request), `bad-answer` (the answer is not JSON or does not match the schema) or `error` (with `message`). `aiMessage(result)` gives the German message for each failure.
- For an image, call `await imageForAi(file)`. It accepts JPEG, PNG, GIF and WebP up to 3.75 MiB per image (Claude accepts 5 MiB as base64 text). It returns `{ kind: "ok", image }`, `{ kind: "wrong-type" }` or `{ kind: "too-large" }`. Put `image` into `images` of the message of the user. For the other kinds, `imageMessage(check)` gives the German message.
- Send to the AI only the data that the feature needs. Show `<AiDataNotice provider={state.provider} data="deine Notizen" />` next to the button that starts the request. `data` is a German noun phrase. The notice shows "Diese Daten gehen an Claude (Anthropic): deine Notizen. Sonst nichts."
- After the request, show the tokens and the cost: `formatUsage(result.usage)`, for example "2.500 Token · ca. 1,8 Cent" or "2.500 Token, davon 1.800 aus dem Cache · ca. 0,4 Cent". The cost is known only for Claude models. For OpenAI, the text shows only the tokens.
- The AI module calls the providers with their official SDKs (`@anthropic-ai/sdk`, `openai`), not with `fetchJson`. See "AI settings for all apps" and "Own AI interface on the official SDKs" in `docs/decisions.md`.
- Give `App` the optional prop `ask` (type `AskAi`) and pass it to `useAi(ask)`. `AskAi` is the type of `state.ask`: `(request) => Promise<AiResult>`. With a fake, `useAi()` is `ready` at once, with `provider: "anthropic"` and `model: "claude-test"` (`TEST_AI`, exported from `@pocket-apps/core/ai`). Then unit tests of the app need no key and no network. The fake gets the request, so a test can check the messages. `AskAi` is generic, so a fake with fixed data needs a type assertion (allowed in tests):

  ```ts
  const ask = vi.fn(() =>
    Promise.resolve({
      kind: "ok",
      data: { results: [] },
      reply: { role: "assistant", text: "{}" },
      usage: { inputTokens: 1, cachedTokens: 0, outputTokens: 1, costUsd: null },
    }),
  ) as unknown as AskAi;
  ```

  For a conversation, give one answer per round: `vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)`. `TEST_AI` needs no action. Tests can compare it with the provider and the model that the app shows.

- To test the AI module itself, replace the browser APIs: `vi.stubGlobal("indexedDB", new IDBFactory())` (from `fake-indexeddb`) and `vi.stubGlobal("fetch", ...)`. A fake `fetch` must return a new `Response` for each call, because the SDKs retry some errors. See `packages/core/src/ai/ask.test.ts`. In browser tests, answer the provider requests with `page.route()`, because the tests have no internet. See `e2e/launcher.spec.ts`.

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

A stateful app defines its data in `src/schema.ts` with `defineDataSchema({ app, validate, initial, migrations })`. `app` is the app ID, `validate` the zod schema, `initial()` the data of a new file and `migrations` the list of migrations. See `apps/app-ideen/src/schema.ts`.
`createDataFileStore(schema, { app: __POCKET_APP__ })` returns `{ DataFileProvider, useDataFile }`. `App` wraps its screen in `<DataFileProvider>`. Components inside call `useDataFile()`. It returns `{ data, update, files }`. `update((data) => newData)` changes the data. Then the store saves it.
`files` reads, writes and removes the extra files of the app in its app folder, for example images (`files.read(name)`, `files.write(name, blob)`, `files.remove(name)`). The name is only the file name, without the folder: lowercase letters, digits and hyphens, then one extension, for example `foto-1a2b.jpg`. Any extension is allowed. The names of the data file and its backups (`<app>.…`) are not allowed. A wrong name gives a rejected promise (a `DataFileError` with a German message). Keep the name of the file in the data file. `files` is `null` only with `folderOptional` (the launcher) while there is no folder. The store does not save these files with the data file and does not check them for conflicts. The app writes such a file when the user acts, for example after the user picks a photo. The promise of `files.write()` fails if the write fails. The status line does not show it, so the app shows its own message.
Data files are JSON. Use SQLite (sql.js) only when an app needs queries that are hard with JSON. See `docs/decisions.md`.

### How the store works

`DataFileProvider` shows the header and then one of these screens:

1. In a browser without the File System Access API: "Bitte Chrome oder Edge verwenden".
2. On the first visit: "Datenordner wählen". The user picks the data folder. The browser keeps the folder in IndexedDB. All apps of the same web address use it. The dev server, `pnpm serve` and GitHub Pages are different addresses. Thus each needs its own folder pick.
3. When the browser has no access to the folder: "Zugriff auf deinen Datenordner". One click gives access again. If the user selects "Bei jedem Besuch erlauben", Chrome does not ask again.
4. Else the app. The file is `<app>/<app>.json`. `<app>` is the `app` field in `schema.ts`. If the file does not exist, the app starts with `initial()`. It writes the file at the first change.
   Earlier versions kept the data file as `<app>.json` in the data folder itself. If the store finds only this old file, it moves it into the app folder first: it writes the copy, reads it back and deletes the old file. Old backups (`<app>.backup-v<N>.json`) stay where they are.

When the app is open, the store does these things:

- It saves each change automatically after 500 ms. The status line under the header shows "Gespeichert" or "Speichert …".
- Before each save, it compares the time of the last change of the file with the time when the app read or wrote it. If the file changed elsewhere (for example on another computer through Google Drive), it does not save. It shows "Nicht gespeichert: Konflikt". The user then loads the other version or saves their own version.
- After a failed save, it shows an error and tries again after 5 seconds.
- While a change is not saved, it warns before the tab closes.
- A click on the folder and file name in the status line (for example "Pocket Apps Daten / app-ideen/app-ideen.json") shows the raw data. The store reads the file again from the data folder. A dialog shows the JSON text with indents and colors. The user can only read it, not change it. If the file does not exist yet, is not JSON or cannot be read, the dialog says so. If a change was not saved at the time of the click, the dialog says that the change is not in the file yet. A broken file (for example not JSON) has the button "Rohdaten ansehen" in its error message. If the browser lost the access to the folder, the click asks for it again.
- The status line has the button "Ordner wechseln". It lets the user pick another folder. The button works only when all changes are saved. After the change, the app loads the file of the new folder. The new folder is then the folder of all apps. Other open tabs keep the old folder until they load again.

#### Optional folder (only for the launcher)

`createDataFileStore(schema, { app, folderOptional: true })` makes the folder optional:

- The app always shows its content. Without a folder, a card above the content asks for the folder ("Datenordner wählen"). If the browser lost the access, the card is "Zugriff auf deinen Datenordner". In Firefox and Safari, a short notice replaces the card.
- Without a folder, `useDataFile()` gives `initial()` as `data`, and `update` does nothing. `hasFolder` is `false`. Hide the actions that change data.
- If the file is broken (for example not JSON), the app shows the error above its content and works as without a folder.
- With a folder, the store works as in a normal stateful app: status line, "Ordner wechseln", automatic save and conflict check. `hasFolder` is `true`.

A normal stateful app does not use `folderOptional`. It needs its folder.

### How a migration runs

When the app reads its data file, `loadData()` in `packages/core` does these steps:

1. It reads the envelope. It stops with an error if the file is not JSON or has no valid envelope.
2. It compares `app` with the app ID. It stops with an error for a file of another app.
3. It compares the schema version of the file with the schema version of the app. It stops with an error if the file is newer.
4. It runs each missing migration in order, in memory. Example: a file with schema version 1 in an app with schema version 3 runs `migrations[0]` (1 → 2), then `migrations[1]` (2 → 3).
5. It validates the result with the zod schema. It stops with an error if the data does not match.

On an error, the app shows the message and does not change the file.
If step 4 ran a migration, the store first writes the unchanged old file into the app folder as `<app>/<app>.backup-v<old schema version>.json`. Then it saves the data in the new shape. If this file exists, it uses `<app>/<app>.backup-v<N>-2.json` and so on. If the backup fails, it shows an error and does not change the data file.

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
- Do not mock internals. For data files, use `createMemoryFolder()` and `createMemoryFolderHost()` from `@pocket-apps/core/data-file/testing`. Pass the host as `folderHost` to `DataFileProvider`.
- `createMemoryFolderHost()` is the first visit (no folder). Set `host.nextPick` to the folder that "Ordner wählen …" returns.
- `createMemoryFolderHost({ saved: folder })` is a folder from an earlier visit with access. Set `folder.access = "prompt"` to test the screen "Zugriff auf deinen Datenordner".
- To start with data, put a file into `folder.files`: `folder.files.set("<app>/<app>.json", { text, lastModified: 1 })`. Extra files with bytes are in `folder.blobs`, for example `folder.blobs.get("lebenslauf/foto-1.jpg")`. `text` is the full envelope as JSON.
- `folder.writeError` makes saves fail. `folder.changeElsewhere(path, text)` simulates a change on another computer (conflict).
- Saves come 500 ms after a change. Do not use fake timers. Wait with `findBy…` queries.
- For app info in unit tests, use `testAppInfo()` from `@pocket-apps/core/testing`.
- jsdom has no layout. Recharts measures its container with `getBoundingClientRect()` and draws nothing at 0 px. In a unit test of a chart, give elements a size with `vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")`. Return all fields of a `DOMRect`, for example `width: 640` and `height: 400`. See `apps/fixkosten/src/app.test.tsx`. This replaces a browser API, not an internal of our code, so it is allowed. `vitest.setup.ts` restores all mocks after each test and gives jsdom an empty `ResizeObserver`.
- Keep pure logic (calculations, list operations) in `.ts` files with their own unit tests.
- The browser tests use the local web server of `pnpm serve`. Playwright starts it.
- `e2e/all-apps.spec.ts` tests every app automatically: start without network, no errors, title and version, Tailwind styles, theme switch, back link, narrow window. It blocks all network requests to other servers. An app with `"network": true` may try requests, but it must start without errors.
- `e2e/launcher.spec.ts` tests the launcher.
- Add `e2e/<app>.spec.ts` for the main flow of a stateful app: pick the folder, change, save, reload. See `e2e/app-ideen.spec.ts`.
- In these tests, call `withDataFolder(page)` from `e2e/helpers.ts` before `page.goto()`. Then the folder dialog returns a folder in the private file system of the browser (OPFS). Use `writeDataFile(page, fileName, text)` and `readDataFile(page, fileName)` for the files in it. Write files after `page.goto()`. `readDataFile()` returns the text or `null`. The path of a data file is `dataFilePath(app)`, for example `app-ideen/app-ideen.json`. Paths can contain folders.
- The browser tests run only in Chromium. Edge uses the same engine. We do not support other browsers.
- To test a browser without folder access (like Firefox or Safari), call `withoutFolderAccess(page)` before `page.goto()`. A stateful app then shows only the notice "Bitte Chrome oder Edge verwenden". The launcher shows the apps and a short notice.

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

- `pnpm check:all` passes.
- For UI changes, run `pnpm build` and `pnpm serve`. Open `http://localhost:4173/pocket-apps/` in Chrome. Look at the apps in light and dark mode.
- For changes to a stateful app or to `packages/core/src/data-file/`, also test with a real folder in Chrome: pick a folder, change data, reload, and look at the file.
