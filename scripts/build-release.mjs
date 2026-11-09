// Collects the built app files and the launcher in release/.
// Run `pnpm build`. It builds all apps and the launcher, then it calls this file.
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { listApps, ROOT_DIR } from "../packages/vite-config/index.js";

const releaseDir = join(ROOT_DIR, "release");

/** @param {string} dir */
function builtFile(dir) {
  const file = join(dir, "dist", "index.html");
  if (!existsSync(file)) throw new Error(`Missing build output: ${file}. Run "pnpm build".`);
  return file;
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir);

const apps = listApps();
for (const app of apps) {
  copyFileSync(builtFile(join(ROOT_DIR, "apps", app.name)), join(releaseDir, `${app.name}.html`));
}
copyFileSync(builtFile(join(ROOT_DIR, "launcher")), join(releaseDir, "index.html"));

console.log(`release/: index.html + ${String(apps.length)} apps`);
