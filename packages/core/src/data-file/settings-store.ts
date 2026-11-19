// Settings of the browser for all pages of the web address: the picked data folder and the
// OneDrive login. They live in IndexedDB (database "pocket-apps", store "settings").

/** A small key-value store. The default keeps the values in IndexedDB. */
export type KeyValueStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
};

function failure(error: DOMException | null): Error {
  return error ?? new Error("IndexedDB failed.");
}

function inSettingsStore<T>(
  action: (store: IDBObjectStore) => IDBRequest<T>,
  mode: IDBTransactionMode,
) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open("pocket-apps", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("settings");
    };
    open.onerror = () => {
      reject(failure(open.error));
    };
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction("settings", mode);
      const result = action(transaction.objectStore("settings"));
      transaction.oncomplete = () => {
        db.close();
        resolve(result.result);
      };
      transaction.onerror = () => {
        db.close();
        reject(failure(transaction.error));
      };
    };
  });
}

/** The key-value store in IndexedDB (database "pocket-apps", store "settings"). */
export const indexedDbStore: KeyValueStore = {
  get: (key) => inSettingsStore((store) => store.get(key), "readonly"),
  set: async (key, value) => {
    await inSettingsStore((store) => store.put(value, key), "readwrite");
  },
};

/**
 * The key of the picked storage: a directory handle (a folder on this computer) or the text
 * "onedrive".
 */
export const FOLDER_KEY = "data-folder";
