# pocket-apps

[![CI - Lint](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-lint.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-lint.yml)
[![CI - Format](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-format.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-format.yml)
[![CI - Typecheck](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-typecheck.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-typecheck.yml)
[![CI - Test](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-test.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-test.yml)
[![CI - E2E](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-e2e.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/ci-e2e.yml)
[![CD - Release](https://github.com/johschmidt42/pocket-apps/actions/workflows/cd-release.yml/badge.svg?branch=main)](https://github.com/johschmidt42/pocket-apps/actions/workflows/cd-release.yml)

Small personal apps for the browser. Open them at **https://johschmidt42.github.io/pocket-apps/**. Each app is one HTML file. Your data stays in a folder on your computer, or in your own OneDrive or Dropbox. No server of ours gets it.

## For users

### Start an app

1. Open https://johschmidt42.github.io/pocket-apps/. The page shows all apps. On the first visit, it also asks where your data should be. Apps without data work without a folder. For apps with data, see "Keep your data".
2. Click an app card. The app opens.
3. Click "Alle Apps" in the header to go back.

Each card shows the app version (for example `1.0`) and two icons. Move the mouse over an icon to see what it means:

- Disk icon: the app keeps your data in a file in your data folder. A crossed-out disk: the app keeps nothing.
- Globe: the app uses an online service. A crossed-out Wi-Fi symbol: the app itself uses no online service. If you keep your data in OneDrive or Dropbox, the app sends your data only there.
- Sparkles: the app has AI features. They use your own API key. See "Set up the AI".

The header shows the app version, for example `1.0`. The moon button switches to dark mode. The sun button switches back to light mode.

### Keep your data

Some apps keep data, for example a list of ideas. All these apps use one data folder. On the start page or in an app that keeps data, find "Wo sollen deine Daten liegen?". You choose once per browser. All apps in this browser then use your choice.

- On a phone, in Firefox and in Safari, the page offers Dropbox and OneDrive.
- In Chrome and Edge on a computer, the page also offers a folder on this computer.
- The page shows Dropbox first, with the label "Empfohlen".

**Dropbox (recommended):** you see the same data on all your devices. You log in only once, and the apps load and save faster than with OneDrive. You need a Dropbox account. It is free.

1. Click "Mit Dropbox verbinden".
2. Log in with your Dropbox account and allow the access. The apps use only the folder `Apps/Pocket Apps` in your Dropbox. They cannot see your other files. This folder is your data folder.
3. Do this once in each browser on each device. The login stays. You log in again only if you remove the access in your Dropbox account.

**OneDrive:** you see the same data on all your devices. You need a Microsoft account. It is free.

1. Click "Mit OneDrive verbinden".
2. Log in with your Microsoft account and allow the access. The apps create the folder `Apps/Pocket Apps` in your OneDrive and use only this folder. They cannot see your other files. This folder is your data folder.
3. Do this once in each browser on each device.
4. Microsoft allows a login of a browser app for 24 hours. Thus, about once a day, the app shows "Bei OneDrive anmelden". Click "Anmelden". Microsoft usually knows your account, so you do not type your password again.

Do not delete the folder `Apps/Pocket Apps` and do not replace it with another folder. OneDrive knows it by an internal ID, not by its name. To bring your data into it, move the app folders (for example `app-ideen/`) into it.

**A folder on this computer:** only this computer has the data.

1. Make a folder, for example "Pocket Apps Daten". If you have the desktop program of OneDrive or Google Drive, put the folder into its folder on your computer. Then you have a backup automatically.
2. Click the button "Ordner wählen …" and select your folder. All apps use this folder. This folder is your data folder.
3. A Chrome window asks if the page can edit the folder. Allow it.

Tip: Do you use OneDrive on your phone and the OneDrive desktop program on your computer? Then you can select the folder `OneDrive/Apps/Pocket Apps` as the folder on this computer. Then the computer and the phone use the same data. Another folder in OneDrive is not the same as "Mit OneDrive verbinden".

Each app has its own folder in the data folder, in OneDrive and in a folder on your computer, for example `app-ideen/`. It keeps its data in a file there, for example `app-ideen/app-ideen.json`. The start page keeps the order of the apps and your favorite apps in `launcher/launcher.json`. Some apps also keep images in their folder, for example `lebenslauf/foto-….jpg` for the photo of a CV. Do not rename or delete these files. If an image is missing, the app shows no image, and you can pick it again.

Earlier versions kept all files directly in the data folder, for example `app-ideen.json`. When you open an app, it moves its file into its folder. Old backup files (for example `kursverlauf.backup-v1.json`) stay where they are. You can delete them when the app shows all your data.

The bar under the header shows where your data is and the status. An icon shows the storage: a box for Dropbox, a cloud for OneDrive, a hard disk for a folder on this computer. On a phone, the bar shows only the name of the storage, not the file. The button "Wechseln" ("Speicherort wechseln" on a computer) opens the choice again. The status is one of these:

- "Gespeichert": the file has all your changes. The apps save each change automatically.
- "Speichert …": the app writes the file now.
- "Speichern fehlgeschlagen": the app could not write the file. It tries again after a few seconds. You can also click "Jetzt erneut versuchen".
- "Nicht gespeichert: Konflikt": the file changed somewhere else, for example on another computer or in another tab. The app does not overwrite it. Click "Neu laden (meine Änderungen verwerfen)" to get the other version. Then you lose your new changes. Or click "Meine Version speichern". Then you lose the other version.

More tips:

- To change the order of the apps on the start page, click "Reihenfolge ändern". The button is there only after you picked your data folder on the start page. Drag each app by the grip at its left side (⋮⋮) to a new place. On a phone, touch the grip and move your finger: the app moves with it, and the list scrolls at the top and the bottom edge. With the keyboard: move the focus to a grip and press the arrow key up or down. The app moves at once, without another key. The start page saves the new order at once in the file `launcher/launcher.json` (the folder `launcher` in your data folder). "Fertig" only closes the view.
- To mark an app as a favorite, click the star on its card. The star is there only when the start page has your data folder. A filled star shows a favorite. The start page shows your favorite apps first, under "Favoriten". The other apps come under "Weitere Apps". Both sections use your order of the apps. To remove a favorite, click the star again. The start page keeps the favorites in `launcher/launcher.json` in your data folder.
- To use another folder or another cloud storage, click "Speicherort wechseln" in the bar under the header. The data does not move with it. To take your data with you, copy the app folders (for example `app-ideen/`) into the new data folder before you change, for example into `Apps/Pocket Apps` on onedrive.com or dropbox.com.
- To end the access of the apps to OneDrive or Dropbox, click "Speicherort wechseln" and select a folder on this computer. Then this browser forgets the login. To remove the access for all devices, remove "Pocket Apps" from the apps with access in your Microsoft account or in the settings of your Dropbox ("Connected apps").
- With a folder on this computer: when you open an app later, the app can show "Zugriff auf deinen Datenordner". Click "Zugriff erlauben" in the app. Then a Chrome window opens. Select "Bei jedem Besuch erlauben" in it. Then Chrome does not ask again.
- On a second device, pick the same cloud storage, or on a second computer the same synced folder. Then both use the same data. Use the apps on one device at a time.
- With OneDrive or Dropbox, the apps need the internet to open and to save your data. Without internet, the app shows an error and tries again.
- If the OneDrive login ends while an app is open, the app cannot save. It shows an error. Reload the page and log in again. A change that the app could not save is then lost. The browser warns you before the reload.
- Do you have a data file from an earlier version of Pocket Apps (before the data folder), for example `app-ideen.json`? Put it into the data folder before you open the app, but only if the app has no folder there yet (for example `app-ideen/`). The app then moves the file into its folder and opens it.

### Set up the AI

Apps with AI features use your own API key of Claude (Anthropic) or OpenAI. The provider charges you for each use. A Claude Pro or ChatGPT subscription does not include this use.

1. Create an API key: for Claude at https://platform.claude.com/settings/keys, for OpenAI at https://platform.openai.com/api-keys. Set a spend limit at the provider. For a Claude key, also set an expiry date. Then a lost key can do little damage.
2. On the start page, pick your data folder. Then click "KI einrichten". An app with AI features also has this dialog.
3. Select the provider. Paste the key into "API-Key".
4. Click "Verbindung prüfen". The app asks the provider for its list of models. This check costs nothing.
5. Select the model. For Claude, the app selects Claude Opus 5.5 first, if your key can use it. Click "Speichern".

Where the app keeps the setup:

- The provider and the model are in the file `ai/ai.json` in your data folder. Your other computers get them with the folder.
- The API key stays in this browser. It is not in the data folder, thus not in OneDrive, Dropbox or Google Drive. In another browser or on another device, also on your phone, type the key once more.
- "Key entfernen" in the same dialog removes the key only from this browser.

The apps block requests to servers that they do not need. This makes it harder for a faulty page on johschmidt42.github.io to send your key away, but not impossible. Thus set the spend limit.

### Updates

- A new app version is online about 10 minutes after the developer publishes it. Reload the page to get it. You do not have to do anything else.
- A new app version can change the data format. Then the app keeps a copy of your old data file in the data folder before it changes anything. The copy has a name like `app-ideen/app-ideen.backup-v1.json`. The number is the old data format, not the app version. Keep the copy until you are sure that the app shows all your data. Then you can delete it.
- An app in an old browser tab cannot open data from a newer app version (for example from another computer). It shows an error. Reload the page to get the newest version.

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

| App           | Data file | Internet | Description                                                                                                                                                                      |
| ------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| zinsrechner   | no        | no       | Compound interest for a capital.                                                                                                                                                 |
| app-ideen     | yes       | no       | Collects ideas for new apps.                                                                                                                                                     |
| fixkosten     | yes       | no       | Running costs as Sankey, bars, tiles and months, with profiles.                                                                                                                  |
| kursverlauf   | yes       | yes      | Price history of ETFs from Xetra, with a comparison.                                                                                                                             |
| countdown     | yes       | no       | Days, hours, minutes and seconds until your events.                                                                                                                              |
| attraktor     | no        | no       | Glowing lines of a strange attractor. The mouse pulls on them.                                                                                                                   |
| schuljahr     | yes       | yes      | Holidays, public holidays and school days of a school year.                                                                                                                      |
| zeitstrahl    | yes       | no       | Moments and time ranges on vertical timelines, for example a CV.                                                                                                                 |
| lebenslauf    | yes       | no       | CV as an A4 page with variants per job ad. Print it or save a PDF.                                                                                                               |
| galerie       | no        | no       | The images of a folder, with thumbnails and a large preview.                                                                                                                     |
| trainingsbuch | yes       | yes      | Logs your results of well-known fitness workouts (for example "The Girls" and the yearly Open), and of workouts that you add. The AI can record a result from a text or a photo. |
