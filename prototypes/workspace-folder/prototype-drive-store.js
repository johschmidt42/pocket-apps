// PROTOTYPE – throwaway. The liftable part: Google Drive REST access without DOM.
// The same layout as the folder prototype, but in a Drive folder:
//   users.json                     { users: [{ id, name }] }
//   <userId>/prototype-app.json    { notes: string[] }
/* eslint-disable */
(function () {
  const API = "https://www.googleapis.com/drive/v3";
  const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
  const FOLDER_MIME = "application/vnd.google-apps.folder";

  function createDriveStore(getToken, onTiming) {
    async function call(label, url, options = {}) {
      const start = performance.now();
      try {
        const response = await fetch(url, {
          ...options,
          headers: { Authorization: `Bearer ${getToken()}`, ...(options.headers ?? {}) },
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`${response.status} ${text.slice(0, 200)}`);
        }
        return response;
      } finally {
        onTiming?.(label, Math.round(performance.now() - start));
      }
    }

    const quote = (value) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    /** All children of a folder that this app can see (with drive.file: only files it may access). */
    async function listChildren(folderId) {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const response = await call("Ordner auflisten", `${API}/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,owners(emailAddress))&pageSize=100`);
      return (await response.json()).files;
    }

    async function findChild(folderId, name, mimeType) {
      const parts = [`'${folderId}' in parents`, `name = '${quote(name)}'`, "trashed = false"];
      if (mimeType) parts.push(`mimeType = '${mimeType}'`);
      const q = encodeURIComponent(parts.join(" and "));
      const response = await call(`suchen: ${name}`, `${API}/files?q=${q}&fields=files(id,name,modifiedTime)`);
      return (await response.json()).files[0] ?? null;
    }

    async function ensureFolder(parentId, name) {
      const found = await findChild(parentId, name, FOLDER_MIME);
      if (found) return found.id;
      const response = await call(`Ordner anlegen: ${name}`, `${API}/files?fields=id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
      });
      return (await response.json()).id;
    }

    async function resolve(rootId, path, create) {
      const parts = path.split("/");
      let parent = rootId;
      for (const part of parts.slice(0, -1)) {
        if (create) parent = await ensureFolder(parent, part);
        else {
          const folder = await findChild(parent, part, FOLDER_MIME);
          if (!folder) return { parent: null, name: parts.at(-1) };
          parent = folder.id;
        }
      }
      return { parent, name: parts.at(-1) };
    }

    async function readJson(rootId, path) {
      const { parent, name } = await resolve(rootId, path, false);
      if (!parent) return null;
      const file = await findChild(parent, name);
      if (!file) return null;
      const response = await call(`gelesen: ${path}`, `${API}/files/${file.id}?alt=media`);
      return response.json();
    }

    async function writeJson(rootId, path, data) {
      const { parent, name } = await resolve(rootId, path, true);
      const body = JSON.stringify(data, null, 2) + "\n";
      const existing = await findChild(parent, name);
      if (existing) {
        await call(`geschrieben: ${path}`, `${UPLOAD}/files/${existing.id}?uploadType=media`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });
        return;
      }
      const boundary = "pocketapps" + Math.random().toString(16).slice(2);
      const multipart =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name, parents: [parent], mimeType: "application/json" }) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
      await call(`neu angelegt: ${path}`, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multipart,
      });
    }

    return { listChildren, readJson, writeJson };
  }

  // Pure functions over the user list (same as in the folder prototype).
  function slug(name) {
    return name.trim().toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "nutzer";
  }
  function addUser(users, name) {
    const base = slug(name);
    let id = base;
    for (let n = 2; users.some((u) => u.id === id); n++) id = `${base}-${n}`;
    return [...users, { id, name: name.trim() }];
  }

  window.DriveProto = { createDriveStore, addUser };
})();
