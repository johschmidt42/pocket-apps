// Collects the built app files and the launcher in release/.
// Run `pnpm build`. It builds all apps and the launcher, then it calls this file.
// Each dist/ holds index.html and the files of the PWA (manifest, icons). They keep their paths.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { listApps, ROOT_DIR } from "../packages/vite-config/index.js";
import { SERVICE_WORKER_FILE } from "../packages/vite-config/pwa.js";

const releaseDir = join(ROOT_DIR, "release");

/**
 * Copies dist/index.html to release/<page>, and the other files of dist/ to release/.
 *
 * @param {string} dir The folder of the app or the launcher.
 * @param {string} page The file name in release/.
 */
function copyBuild(dir, page) {
  const distDir = join(dir, "dist");
  const file = join(distDir, "index.html");
  if (!existsSync(file)) throw new Error(`Missing build output: ${file}. Run "pnpm build".`);
  copyFileSync(file, join(releaseDir, page));
  const others = readdirSync(distDir, { recursive: true, withFileTypes: true }).filter(
    (entry) => entry.isFile() && join(entry.parentPath, entry.name) !== file,
  );
  for (const entry of others) {
    const path = relative(distDir, join(entry.parentPath, entry.name));
    const target = join(releaseDir, path);
    // Two builds must not write the same file, for example the same icon name.
    if (existsSync(target)) throw new Error(`Two builds have the file release/${path}.`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(distDir, path), target);
  }
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir);

const apps = listApps();
for (const app of apps) copyBuild(join(ROOT_DIR, "apps", app.name), `${app.name}.html`);
copyBuild(join(ROOT_DIR, "launcher"), "index.html");
copyFileSync(
  join(ROOT_DIR, "packages", "vite-config", "service-worker.js"),
  join(releaseDir, SERVICE_WORKER_FILE),
);

console.log(`release/: index.html + ${String(apps.length)} apps + ${SERVICE_WORKER_FILE}`);
