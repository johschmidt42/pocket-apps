# Data file store

`@pocket-apps/core/data-file` keeps the data of a stateful app in its data file: `<app>/<app>.json` in the data folder that the user picked. Read this file before you write or change a stateful app. For the terms (storage, data folder, app folder, envelope, extra file), see `AGENTS.md`. In the code, "folder" means the data folder of any storage kind, also OneDrive: `DataFolder`, `hasFolder`, `folderOptional`.

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

1. On the first visit: "Wo sollen deine Daten liegen?". It shows the storage kinds that this browser offers:
   - "Ordner auf diesem Computer" with the button "Ordner wählen …". Only browsers with the folder dialog offer it (Chrome and Edge on a computer). The browser keeps the folder in IndexedDB.
   - "OneDrive" with the button "Mit OneDrive verbinden", and "Dropbox" with the button "Mit Dropbox verbinden". All browsers with Web Crypto offer them (on `https` and on `localhost`). The texts say that the user sees the same data on all devices.
2. When the browser has no access to a local folder: "Zugriff auf deinen Datenordner". One click gives access again. If the user selects "Bei jedem Besuch erlauben", Chrome does not ask again.
3. When the login of a cloud storage ended: "Bei OneDrive anmelden" (24 hours after the login) or "Bei Dropbox anmelden" (only if the user removed the access). The button "Anmelden" goes to the login of the provider without the list of accounts.
4. Else the app. If the data file does not exist, the app starts with `initial()`. The store writes the file at the first change.
5. Only in a browser without Web Crypto and without the folder dialog (for example a page over `http` that is not `localhost`): "Dieser Browser kann keine Daten speichern".

All apps of the same web address use the same storage. The dev server, `pnpm serve` and GitHub Pages are different addresses. Thus each needs its own pick.

Earlier versions kept the data file as `<app>.json` in the data folder itself. This applies to all storage kinds. If the store finds only this old file, it moves it into the app folder first: it writes the copy, reads it back and deletes the old file. Old backups (`<app>.backup-v<N>.json`) stay where they are.

## Storage kinds

A storage kind is a `StorageKind` in `folder.ts`: `"local"` (a folder on this computer) or a cloud storage (`CloudKind`: `"onedrive"`, `"dropbox"`). The files of all kinds have the same paths: `<app>/<app>.json`, `launcher/launcher.json`, `ai/ai.json`.

The code of each kind is a `DataFolder`. Its JSDoc in `folder.ts` gives each function: `read()` and `readBlob()` give `null` for a missing file, `lastModified()` gives a time in ms or `null`, `write()` gives the new time, `remove()` does nothing for a missing file, `queryAccess()` gives `"granted"` or `"prompt"`. `name` shows in the status line ("Dropbox / <app>/<app>.json"). The store and the apps see only this interface.

- `browser-folder.ts`: `createBrowserFolderHost()` is the real `FolderHost`. `kinds()` gives the kinds that this browser offers. `loadSaved()` ends a login that comes back and gives the saved choice. `pick(kind)` lets the user pick. A local folder is `wrapDirectory()` in the same file. `PROVIDERS` lists the cloud storages.
- `cloud-login.ts`: the login of all cloud storages (see "Login of the cloud storages").
- `onedrive-folder.ts`, `dropbox-folder.ts`: the `CloudProvider` and the `DataFolder` of each cloud storage.
- `settings-store.ts`: the key-value store in IndexedDB (database `pocket-apps`, store `settings`). The key `data-folder` holds the choice: a directory handle, or the text of a `CloudKind`. The key `<kind>-tokens` holds the tokens of a cloud storage.
- `storage-kinds.ts`: the texts of each kind in the choice and on the screen of an expired login. `storage-choice.tsx` shows the choice. `data-folder-gate.tsx` shows it on the first visit and in the dialog "Speicherort wählen".
- `STORAGE_ORIGINS` in `packages/vite-config/index.js`: the origins that the page code calls (`connect-src`): the token endpoint, the API and the server of the file contents. The login page of a provider is a page change, not a request, so it needs no entry.
- The conflict check uses the time of the last change (`lastModified`) for all kinds. A cloud storage also keeps the version of each file from the last check in its `DataFolder` (eTag, revision). The next write sends it, and the provider writes only if nobody changed the file in between. A write without a check (for example an image) overwrites the file.

## Login of the cloud storages

`cloud-login.ts` has the login for all cloud storages: OAuth 2.0 with PKCE in the browser, without a secret and without a server. A provider that needs a client secret for its token endpoint does not work this way.

- A `CloudProvider` gives: `kind`, `name` (for messages), `company` (the company of the login), `clientId` (the public ID of the app registration), `authorizeUrl`, `tokenUrl`, `authorizeFields` (more fields of the login, for example `scope` or `token_access_type`), `chooseAccountFields` (fields that show the list of accounts at the first login) and `refreshFields`.
- `createCloudSession(provider)` gives a `CloudSession`: `queryAccess()`, `request(url, init)` (with the access token), `startLogin()`, `forget()` and `failure(message)`.
- The login always comes back to the start page of the site (`/pocket-apps/`, on the dev server `/`). Before the login, `startLogin()` keeps the provider, the PKCE verifier, the `state` and the address of the app page in `sessionStorage`. `finishCloudLogin()` on the start page checks the `state`, gets the tokens, saves the choice and goes back to the app page. Thus the app registration of a provider needs only one address per web address, and a new app needs no change of the registration. Each registration lists `http://localhost:5173/`, `http://localhost:4173/pocket-apps/` and `https://johschmidt42.github.io/pocket-apps/`. The dev server must run on port 5173.
- A failed or cancelled login goes back to the page of the app too. That page shows the error. If the user had a storage before, the app keeps it.
- The session refreshes the access token before it ends. Two requests at the same time use one refresh. If the provider does not accept the refresh token (400 or 401), the tokens go away and the app shows "Bei … anmelden". Other failures (for example 503) keep the tokens.
- Errors are `DataFileError`s with a German message: `"cloud-login"` for a login that is not valid (`request()` throws it on 401 and forgets the tokens), `"cloud-failed"` for all other failures (`session.failure(message)`): a conflict, an HTTP error (the store tries again), an answer of an unexpected shape, and no connection.
- If the login ends while the app is open, a save fails. "Jetzt erneut versuchen" goes to the login of the provider. A change that is not saved is then lost. The browser warns before the page leaves.

## Add a cloud storage

For example Google Drive:

1. Register an app with the name "Pocket Apps" at the provider. Some providers keep the first name for the folder. Allow only the app folder, add the three redirect addresses (see "Login of the cloud storages") and allow public clients (PKCE). Put the public client ID into the code, never a secret.
2. Add the kind to `CloudKind` in `folder.ts`.
3. Write `<kind>-folder.ts` with a `CloudProvider` and a `DataFolder`, like `dropbox-folder.ts`. Use the folder `/Apps/Pocket Apps`. Map the HTTP answers to `session.failure()` messages, and keep the version of each file for the next write. A provider without paths (Google Drive uses file IDs) maps each path to an ID in its `DataFolder`.
4. Write `<kind>-folder.test.ts` with a fake `fetch` that follows the rules of the API, like `dropbox-folder.test.ts`. `packages/core` needs 100 % coverage.
5. Add the kind to `PROVIDERS`, `isCloudKind()` and `kinds()` in `browser-folder.ts`.
6. Add its texts to `storage-kinds.ts`: the choice and the text of an expired login. Say that the user sees the same data on all devices.
7. Add the origins to `STORAGE_ORIGINS`.
8. Add a browser test with a fake of the provider, like `e2e/dropbox.spec.ts`.
9. Update this README, the terms in `AGENTS.md` and the user guide in `README.md`. Add a decision entry.

## OneDrive

`onedrive-folder.ts` keeps the data in the app folder `/Apps/Pocket Apps` of the OneDrive of the user, over Microsoft Graph. The app registration "Pocket Apps" (Microsoft Entra, `clientId` in `ONEDRIVE`) allows only this folder (`Files.ReadWrite.AppFolder`).

- Microsoft gives a browser app a refresh token for 24 hours. A new refresh token keeps the end time of the first one. Thus the user logs in again once a day, also with daily use.
- A file that does not exist gives a 404 answer. Chrome writes each 404 answer to the console. This is normal.
- A read gets the time of the last change first, then the content. In this order, a change in between gives a conflict at the next save, not a lost change.
- A write sends the eTag of the last check as `If-Match`. A change in between gives 412.
- A write is one request (Graph "simple upload"). Graph limits its size. The data files and the photos of the apps are small. Large files are not tested.

## Dropbox

`dropbox-folder.ts` keeps the data in the app folder `/Apps/Pocket Apps` of the Dropbox of the user, over the Dropbox API. The Dropbox app "Pocket Apps" has the access type "App folder" and the permissions `files.metadata.read`, `files.content.read` and `files.content.write`. Its app key is `clientId` in `DROPBOX`.

- The login asks for `token_access_type=offline`. Then Dropbox gives a refresh token without an end. A refresh gives no new refresh token: the old one stays. The user logs in once per browser.
- A file that does not exist gives an error answer (409, "path/not_found"). Chrome writes it to the console. This is normal.
- A read gets the metadata first (`get_metadata`), then the content (`download`).
- A write (`upload`) uses the state of the last check: `update` with the revision, `add` for a file that did not exist, or `overwrite` for a file without a check. A change in between gives 409 "path/conflict".
- The header `Dropbox-API-Arg` takes only ASCII. The code escapes other characters.

## While the app is open

- The store saves each change automatically after 500 ms. The status line under the header shows "Gespeichert" or "Speichert …".
- Before each save, the store compares the time of the last change of the file with the time when the app read or wrote it. If the file changed elsewhere (for example on another device), the store does not save. It shows "Nicht gespeichert: Konflikt". The user then loads the other version or saves their own version.
- After a failed save, the store shows an error and tries again after 5 seconds.
- While a change is not saved, the store warns before the tab closes.
- A click on the folder and file name in the status line (for example "Pocket Apps Daten / app-ideen/app-ideen.json") shows the raw data. The store reads the file again from the data folder. A dialog shows the JSON text with indents and colors. The user can only read it. If the file does not exist yet, is not JSON or cannot be read, the dialog says so. If a change was not saved at the time of the click, the dialog says that the change is not in the file yet. A broken file has the button "Rohdaten ansehen" in its error message. If the browser lost the access to the folder, the click asks for it again: for a local folder in a Chrome window, for a cloud storage with the login of the provider.
- The button "Speicherort wechseln" in the status line opens the dialog "Speicherort wählen" with the same choice. It works only when all changes are saved. After the change, the app loads the file of the new storage. The new storage is then the storage of all apps. Other open tabs keep the old storage until they load again. A pick of a local folder forgets the logins of all cloud storages. A pick of a cloud storage keeps the earlier choice until the login works.

## Optional folder (only for the launcher)

`createDataFileStore(schema, { app, folderOptional: true })` makes the folder optional. A normal stateful app does not use it.

- The app always shows its content. Without a folder, a card above the content asks for the storage ("Wo sollen deine Daten liegen?"). If the browser lost the access, the card is "Zugriff auf deinen Datenordner" or "Bei … anmelden" (for example "Bei Dropbox anmelden"). In a browser that offers no storage, a short notice replaces the card.
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
- `createMemoryFolderHost()` is the first visit (no folder). Set `host.nextPick` to the folder that "Ordner wählen …" or a button such as "Mit Dropbox verbinden" returns. `host.pickedKind` is the kind of the last pick.
- `createMemoryFolderHost({ kinds: ["onedrive", "dropbox"] })` is a browser without the folder dialog (Firefox, Safari, a phone). `kinds: []` is a browser that offers no storage.
- `createMemoryFolder(name, "dropbox")` is a folder in a cloud storage. With `folder.access = "prompt"`, the app shows "Bei Dropbox anmelden".
- `createMemoryFolderHost({ saved: folder })` is a folder from an earlier visit with access. Set `folder.access = "prompt"` to test the screen "Zugriff auf deinen Datenordner".
- To start with data, put a file into `folder.files`. The path is `<app>/<app>.json`. `text` is the full envelope as JSON: `{ app, schemaVersion, savedWith, savedAt, data }`.
- To check a save, read `folder.files.get("<app>/<app>.json")?.text`. Extra files with bytes are in `folder.blobs`, for example `folder.blobs.get("lebenslauf/foto-1.jpg")`.
- Set `folder.writeError` to an `Error` to make saves fail. `folder.changeElsewhere(path, text)` simulates a change on another computer (conflict). The path is the same as in `folder.files`.
- Saves come 500 ms after a change. Wait with `findBy…` queries, not with fake timers.
