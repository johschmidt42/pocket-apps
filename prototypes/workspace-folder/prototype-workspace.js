// PROTOTYPE – throwaway. The liftable part: data-folder logic without DOM.
// Layout of the data folder:
//   users.json                     { users: [{ id, name }] }
//   <userId>/launcher.json         { priorities: string[] }
//   <userId>/<app>.json            app data
/* eslint-disable */
(function () {
  const DB_NAME = "pocket-apps-prototype";
  const STORE = "kv";
  const HANDLE_KEY = "data-folder";

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idb(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  /** The folder handle that a page stored before, or null. */
  const loadFolder = () => idb("readonly", (s) => s.get(HANDLE_KEY)).then((h) => h ?? null);
  const saveFolder = (handle) => idb("readwrite", (s) => s.put(handle, HANDLE_KEY));
  const forgetFolder = () => idb("readwrite", (s) => s.delete(HANDLE_KEY));

  /** "granted" | "prompt" | "denied". Never shows a dialog. */
  const queryAccess = (handle) => handle.queryPermission({ mode: "readwrite" });
  /** Shows the Chrome permission dialog if necessary. Needs a click (user activation). */
  const requestAccess = (handle) => handle.requestPermission({ mode: "readwrite" });

  async function readJson(dir, path) {
    const parts = path.split("/");
    let current = dir;
    try {
      for (const part of parts.slice(0, -1)) current = await current.getDirectoryHandle(part);
      const file = await (await current.getFileHandle(parts.at(-1))).getFile();
      return JSON.parse(await file.text());
    } catch (error) {
      if (error.name === "NotFoundError") return null;
      throw error;
    }
  }

  async function writeJson(dir, path, data) {
    const parts = path.split("/");
    let current = dir;
    for (const part of parts.slice(0, -1)) current = await current.getDirectoryHandle(part, { create: true });
    const writable = await (await current.getFileHandle(parts.at(-1), { create: true })).createWritable();
    await writable.write(JSON.stringify(data, null, 2) + "\n");
    await writable.close();
  }

  // Pure functions over the user list.
  function slug(name) {
    return name.trim().toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "nutzer";
  }
  function addUser(users, name) {
    const base = slug(name);
    let id = base;
    for (let n = 2; users.some((u) => u.id === id); n++) id = `${base}-${n}`;
    return [...users, { id, name: name.trim() }];
  }
  const removeUser = (users, id) => users.filter((u) => u.id !== id);

  const readUsers = async (dir) => (await readJson(dir, "users.json"))?.users ?? [];
  const writeUsers = (dir, users) => writeJson(dir, "users.json", { users });
  const removeUserFolder = (dir, id) => dir.removeEntry(id, { recursive: true }).catch(() => {});

  window.Workspace = {
    loadFolder, saveFolder, forgetFolder, queryAccess, requestAccess,
    readJson, writeJson, addUser, removeUser, readUsers, writeUsers, removeUserFolder,
  };

  // Event log, shared by all prototype pages (localStorage is shared under file:// in Chrome).
  const LOG_KEY = "pocket-apps-prototype-log";
  window.ProtoLog = {
    all: () => JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"),
    add(page, text, kind = "info") {
      const entries = this.all();
      entries.push({ time: new Date().toLocaleTimeString("de-DE"), page, text, kind });
      localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-200)));
    },
    clear: () => localStorage.removeItem(LOG_KEY),
  };
})();
