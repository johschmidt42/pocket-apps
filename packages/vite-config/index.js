// Shared Vite config for all apps and the launcher.
// Plain JavaScript, so that Node can load it without a TypeScript step.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { z } from "zod";

/** The repository root folder. */
export const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const backLinkSchema = z.object({ href: z.string().min(1), label: z.string().min(1) });

const repoConfigSchema = z.object({
  backLink: backLinkSchema.extend({ enabled: z.boolean() }),
});

const packageSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, "Use lowercase letters, digits and hyphens."),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning, e.g. 0.1.0."),
  description: z.string().min(1),
  pocketApp: z.object({
    title: z.string().min(1),
    emoji: z.string().min(1),
    stateful: z.boolean(),
    backLink: z.boolean().optional(),
  }),
});

/**
 * Reads a JSON file and validates it. Stops the build with a clear message if it is wrong.
 *
 * @template T
 * @param {string} path
 * @param {z.ZodType<T>} schema
 * @returns {T}
 */
function readValidJson(path, schema) {
  const result = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!result.success) {
    throw new Error(`${path} is not valid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Reads and validates pocket-apps.config.json in the root folder. */
export function readRepoConfig() {
  return readValidJson(join(ROOT_DIR, "pocket-apps.config.json"), repoConfigSchema);
}

/**
 * Reads the info of one app from its package.json and the repo config.
 *
 * @param {string} appDir
 * @returns {import("./index.d.ts").AppInfo}
 */
export function readAppInfo(appDir) {
  const pkg = readValidJson(join(appDir, "package.json"), packageSchema);
  const { pocketApp } = pkg;
  const { backLink } = readRepoConfig();
  // pocketApp.backLink: false turns the link off for one app.
  const showBackLink = backLink.enabled && pocketApp.backLink !== false;
  return {
    name: pkg.name,
    title: pocketApp.title,
    version: pkg.version,
    description: pkg.description,
    emoji: pocketApp.emoji,
    stateful: pocketApp.stateful,
    backLink: showBackLink ? { href: backLink.href, label: backLink.label } : null,
  };
}

/** Reads the info of all apps in apps/, sorted by title. */
export function listApps() {
  const appsDir = join(ROOT_DIR, "apps");
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(appsDir, entry.name, "package.json")))
    .map((entry) => readAppInfo(join(appsDir, entry.name)))
    .sort((a, b) => a.title.localeCompare(b.title, "de"));
}

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (char) => `&#${String(char.charCodeAt(0))};`);
}

/**
 * Sets the <title> and adds the app name and version as meta tags.
 * Then everyone can read the version of an app file without opening it.
 *
 * @param {import("./index.d.ts").AppInfo} app
 * @returns {import("vite").Plugin}
 */
function appMetaPlugin(app) {
  return {
    name: "pocket-apps:meta",
    transformIndexHtml(html) {
      return {
        html: html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(app.title)}</title>`),
        tags: [
          { tag: "meta", attrs: { name: "pocket-app-name", content: app.name }, injectTo: "head" },
          {
            tag: "meta",
            attrs: { name: "pocket-app-version", content: app.version },
            injectTo: "head",
          },
        ],
      };
    },
  };
}

/**
 * Creates the Vite config for one app or the launcher.
 * The build output is one self-contained HTML file: dist/index.html.
 *
 * @param {string} configUrl The URL of the vite.config.ts. Use `import.meta.url`.
 * @param {{ withAppList?: boolean }} [options] `withAppList`: also define `__POCKET_APPS__` (launcher).
 */
export function createAppConfig(configUrl, options = {}) {
  const appDir = fileURLToPath(new URL(".", configUrl));
  const app = readAppInfo(appDir);

  return defineConfig({
    root: appDir,
    // Relative paths, because the file opens from disk (file://).
    base: "./",
    plugins: [react(), tailwindcss(), viteSingleFile(), appMetaPlugin(app)],
    define: {
      __POCKET_APP__: JSON.stringify(app),
      __POCKET_APPS__: JSON.stringify(options.withAppList === true ? listApps() : []),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  });
}
