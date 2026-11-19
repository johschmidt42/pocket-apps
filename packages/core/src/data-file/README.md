# Data file store

`@pocket-apps/core/data-file` keeps the data of a stateful app in its data file: `<app>/<app>.json` in the data folder that the user picked. Read this file before you write or change a stateful app. For the terms (data folder, app folder, envelope, extra file), see `AGENTS.md`.

## Use it in an app

All names come from `@pocket-apps/core/data-file`. The test helpers come from `@pocket-apps/core/data-file/testing`.

1. In `src/schema.ts`, call `defineDataSchema({ app, validate, initial, migrations })`. `app` is the app ID, `validate` the zod schema, `initial()` the data of a new file and `migrations` the list of migrations. A new app has `migrations: []`. The schema version is `1 + migrations.length`. See `apps/app-ideen/src/schema.ts`.
2. Call `createDataFileStore(schema, { app: __POCKET_APP__ })` once, at module level. It returns `{ DataFileProvider, useDataFile }`.
3. `App` wraps its screen in `<DataFileProvider>`. The provider shows the header (`AppHeader`) and the status line. It shows the screen of the app only when the data is loaded.
4. Components inside call `useDataFile()`. It returns `{ data, update, hasFolder, files }`.
   - `update((data) => newData)` changes the data. Then the store saves it.
   - `files` reads, writes and removes the extra files of the app in its app folder: `files.read(name)`, `files.write(name, blob)` and `files.remove(name)`.
   - In a normal stateful app, `hasFolder` is always `true` and `files` is never `null`. Only the launcher uses `folderOptional`, see below.

### Extra files

- The name is only the file name, without the folder: lowercase letters, digits and hyphens, then one extension, for example `foto-1a2b.jpg`. Any extension is allowed.
- The names of the data file and its backups (`<app>.…`) are not allowed. A wrong name gives a rejected promise (a `DataFileError` with a German message).
- Keep the name of the file in the data file.
- The store does not save these files with the data file and does not check them for conflicts. The app writes a file when the user acts, for example after the user picks a photo.
- The promise of `files.write()` fails if the write fails. The status line does not show it, so the app shows its own message.
- `files` is `null` only with `folderOptional` while there is no folder.

## What the user sees

`DataFileProvider` shows the header and then one of these screens:

1. In a browser without the File System Access API: "Bitte Chrome oder Edge verwenden".
2. On the first visit: the card "Datenordner wählen" with the button "Ordner wählen …". The user picks the data folder. The browser keeps the folder in IndexedDB. All apps of the same web address use it. The dev server, `pnpm serve` and GitHub Pages are different addresses. Thus each needs its own folder pick.
3. When the browser has no access to the folder: "Zugriff auf deinen Datenordner". One click gives access again. If the user selects "Bei jedem Besuch erlauben", Chrome does not ask again.
4. Else the app. If the data file does not exist, the app starts with `initial()`. The store writes the file at the first change.

Earlier versions kept the data file as `<app>.json` in the data folder itself. If the store finds only this old file, it moves it into the app folder first: it writes the copy, reads it back and deletes the old file. Old backups (`<app>.backup-v<N>.json`) stay where they are.

## While the app is open

- The store saves each change automatically after 500 ms. The status line under the header shows "Gespeichert" or "Speichert …".
- Before each save, the store compares the time of the last change of the file with the time when the app read or wrote it. If the file changed elsewhere (for example on another computer through Google Drive), the store does not save. It shows "Nicht gespeichert: Konflikt". The user then loads the other version or saves their own version.
- After a failed save, the store shows an error and tries again after 5 seconds.
- While a change is not saved, the store warns before the tab closes.
- A click on the folder and file name in the status line (for example "Pocket Apps Daten / app-ideen/app-ideen.json") shows the raw data. The store reads the file again from the data folder. A dialog shows the JSON text with indents and colors. The user can only read it. If the file does not exist yet, is not JSON or cannot be read, the dialog says so. If a change was not saved at the time of the click, the dialog says that the change is not in the file yet. A broken file has the button "Rohdaten ansehen" in its error message. If the browser lost the access to the folder, the click asks for it again.
- The button "Ordner wechseln" in the status line lets the user pick another folder. It works only when all changes are saved. After the change, the app loads the file of the new folder. The new folder is then the folder of all apps. Other open tabs keep the old folder until they load again.

## Optional folder (only for the launcher)

`createDataFileStore(schema, { app, folderOptional: true })` makes the folder optional. A normal stateful app does not use it.

- The app always shows its content. Without a folder, a card above the content asks for the folder ("Datenordner wählen"). If the browser lost the access, the card is "Zugriff auf deinen Datenordner". In Firefox and Safari, a short notice replaces the card.
- Without a folder, `useDataFile()` gives `initial()` as `data`, and `update` does nothing. `hasFolder` is `false`. Hide the actions that change data.
- If the file is broken (for example not JSON), the app shows the error above its content and works as without a folder.
- With a folder, the store works as in a normal stateful app. `hasFolder` is `true`.

## How a migration runs

When the app reads its data file, `loadData()` does these steps:

1. It reads the envelope. It stops with an error if the file is not JSON or has no valid envelope.
2. It compares `app` with the app ID. It stops with an error for a file of another app.
3. It compares the schema version of the file with the schema version of the app. It stops with an error if the file is newer.
4. It runs each missing migration in order, in memory. Example: a file with schema version 1 in an app with schema version 3 runs `migrations[0]` (1 → 2), then `migrations[1]` (2 → 3).
5. It validates the result with the zod schema. It stops with an error if the data does not match.

On an error, the app shows the message and does not change the file.

If step 4 ran a migration, the store first writes the unchanged old file into the app folder as `<app>/<app>.backup-v<old schema version>.json`. Then it saves the data in the new shape. If the backup file exists, the store adds a number: `<app>/<app>.backup-v1-2.json`, then `-3`, and so on. If the backup fails, the store shows an error and does not change the data file.

To add a migration, follow "Change the data shape" in `AGENTS.md`.

## Unit tests

Use the memory folder instead of mocks. Render the component in `DataFileProvider`, and pass a memory host as `folderHost`. See `apps/app-ideen/src/idea-list-view.test.tsx`.

```tsx
const folder = createMemoryFolder();
folder.files.set("app-ideen/app-ideen.json", { text: fileText, lastModified: 1 });
render(
  <DataFileProvider folderHost={createMemoryFolderHost({ saved: folder })}>
    <IdeaListView />
  </DataFileProvider>,
);
```

- `createMemoryFolder()` makes an empty folder with the name "Pocket Apps Daten".
- `createMemoryFolderHost()` is the first visit (no folder). Set `host.nextPick` to the folder that "Ordner wählen …" returns.
- `createMemoryFolderHost({ saved: folder })` is a folder from an earlier visit with access. Set `folder.access = "prompt"` to test the screen "Zugriff auf deinen Datenordner".
- To start with data, put a file into `folder.files`. The path is `<app>/<app>.json`. `text` is the full envelope as JSON: `{ app, schemaVersion, savedWith, savedAt, data }`.
- To check a save, read `folder.files.get("<app>/<app>.json")?.text`. Extra files with bytes are in `folder.blobs`, for example `folder.blobs.get("lebenslauf/foto-1.jpg")`.
- Set `folder.writeError` to an `Error` to make saves fail. `folder.changeElsewhere(path, text)` simulates a change on another computer (conflict). The path is the same as in `folder.files`.
- Saves come 500 ms after a change. Wait with `findBy…` queries, not with fake timers.
