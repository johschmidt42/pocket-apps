// Serves release/ at http://localhost:4173/pocket-apps/, like GitHub Pages.
// The browser tests start it (see playwright.config.ts). Run `pnpm build` first.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { ROOT_DIR } from "../packages/vite-config/index.js";

const PORT = 4173;
const PREFIX = "/pocket-apps/";
const RELEASE_DIR = join(ROOT_DIR, "release");
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json" };

createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  if (!path.startsWith(PREFIX)) {
    response.writeHead(404).end("Not found");
    return;
  }
  const relative = normalize(path.slice(PREFIX.length) || "index.html");
  if (relative.startsWith("..")) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  readFile(join(RELEASE_DIR, relative))
    .then((body) => {
      const type = TYPES[/** @type {keyof typeof TYPES} */ (extname(relative))];
      response.writeHead(200, { "content-type": type ?? "application/octet-stream" }).end(body);
    })
    .catch(() => {
      response.writeHead(404).end("Not found");
    });
}).listen(PORT, () => {
  console.log(`release/ at http://localhost:${String(PORT)}${PREFIX}`);
});
