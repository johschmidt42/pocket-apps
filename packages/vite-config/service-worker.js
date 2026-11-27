// The one service worker of the site (release/sw.js). It controls the launcher and all apps.
// The Chrome docs say that Chrome fires the event "beforeinstallprompt" (for the install button in
// the app header) only for a page with a service worker that handles "fetch". In a test with
// Chromium on a computer, the event also came without it. See "Apps as installable PWAs" in
// docs/decisions.md.
//
// Network first: each page and file of the site comes from the web server, and the worker keeps a
// copy. Only without a connection, the worker gives the copy. Thus the user always gets the newest
// version, and an app also starts offline. The worker does not touch the requests to other servers
// (cloud storage, APIs, AI), and it never keeps user data.

const CACHE = "pocket-apps-v1";

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

/**
 * The key of the copy: the address without query and hash (for example the login code).
 *
 * @param {Request} request
 */
function keyOf(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
}

/** @param {Request} request */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  let response;
  try {
    // "no-cache": ask the web server, also when the HTTP cache of the browser has a copy.
    response = await fetch(request, { cache: "no-cache" });
  } catch (error) {
    const copy = await cache.match(keyOf(request));
    if (copy !== undefined) return copy;
    throw error;
  }
  if (response.ok && !response.redirected) {
    // A full storage must not stop the page. Then the next offline start has no copy.
    await cache.put(keyOf(request), response.clone()).catch(() => undefined);
  }
  return response;
}
