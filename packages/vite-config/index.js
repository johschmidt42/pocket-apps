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
import { pwaPlugin } from "./pwa.js";

/** The repository root folder. */
export const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The APIs of the AI providers. Every app with "ai": true may call them. */
export const AI_ORIGINS = ["https://api.anthropic.com", "https://api.openai.com"];

/**
 * The cloud storages that the user can pick for the data. Every app with "stateful": true may
 * call them.
 * - OneDrive: the Microsoft login, Microsoft Graph, and the servers of the file downloads (Graph
 *   sends a download to them): personal accounts and work accounts (SharePoint).
 * - Dropbox: the API (with the token endpoint) and the server for the file contents.
 */
export const STORAGE_ORIGINS = [
  "https://login.microsoftonline.com",
  "https://graph.microsoft.com",
  "https://*.1drv.com",
  "https://*.microsoftpersonalcontent.com",
  "https://*.sharepoint.com",
  "https://api.dropboxapi.com",
  "https://content.dropboxapi.com",
];

const backLinkSchema = z.object({ href: z.string().min(1), label: z.string().min(1) });

const repoConfigSchema = z.object({
  backLink: backLinkSchema.extend({ enabled: z.boolean() }),
});

const packageSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, "Use lowercase letters, digits and hyphens."),
  // Versions are major.minor. npm needs three parts, so the third part is always 0.
  version: z
    .string()
    .regex(/^\d+\.\d+\.0$/, 'Use "major.minor.0", for example "1.0.0" or "2.3.0".'),
  description: z.string().min(1),
  pocketApp: z
    .object({
      title: z.string().min(1),
      emoji: z.string().min(1),
      stateful: z.boolean(),
      network: z.boolean(),
      // AI features: the app uses the AI settings (ai/ai.json and the key in the browser).
      ai: z.boolean().optional(),
      // The web addresses (origins) of the external APIs. Only these, the app itself and (with
      // "ai") the AI providers are allowed (Content Security Policy).
      connect: z
        .array(
          z
            .string()
            .regex(/^https:\/\/[a-z0-9.-]+$/, 'Use an origin, e.g. "https://api.example.org".'),
        )
        .optional(),
      backLink: z.boolean().optional(),
    })
    .refine((app) => app.ai !== true || (app.stateful && app.network), {
      message: 'An app with "ai": true needs "stateful": true and "network": true.',
      path: ["ai"],
    })
    .refine((app) => app.network || (app.connect ?? []).length === 0, {
      message: 'An app with "network": false has no "connect" list.',
      path: ["connect"],
    })
    .refine((app) => !app.network || app.ai === true || (app.connect ?? []).length > 0, {
      message: 'An app with "network": true lists its APIs in "connect" (or has "ai": true).',
      path: ["connect"],
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
    // "1.2.0" → "1.2". Users see only major.minor.
    version: pkg.version.replace(/\.0$/, ""),
    description: pkg.description,
    emoji: pocketApp.emoji,
    stateful: pocketApp.stateful,
    network: pocketApp.network,
    ai: pocketApp.ai === true,
    apis: (pocketApp.connect ?? []).length > 0,
    allowedOrigins: [
      ...(pocketApp.connect ?? []),
      ...(pocketApp.ai === true ? AI_ORIGINS : []),
      ...(pocketApp.stateful ? STORAGE_ORIGINS : []),
    ],
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
 * Adds a Content Security Policy as the first tag in <head>. Requests of the page code (fetch,
 * XMLHttpRequest, WebSocket, EventSource) can go only to its own web address and to
 * `app.allowedOrigins`. This makes it harder for a foreign script to send data (for example
 * an API key) to another server. It does not stop all ways: an image URL or a page change can
 * still carry data. Scripts and styles are inline in the one HTML file, so the policy limits
 * only `connect-src`. Only for the build: the dev server needs its own
 * WebSocket. See "Content Security Policy" in docs/decisions.md.
 *
 * @param {import("./index.d.ts").AppInfo} app
 * @returns {import("vite").Plugin}
 */
function cspPlugin(app) {
  return {
    name: "pocket-apps:csp",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: ["connect-src 'self'", ...app.allowedOrigins].join(" "),
          },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

/**
 * Creates the Vite config for one app or the launcher.
 * The build output is one self-contained HTML file: dist/index.html.
 *
 * @param {string} configUrl The URL of the vite.config.ts. Use `import.meta.url`.
 * @param {{ withAppList?: boolean, installable?: boolean }} [options] `withAppList`: also define
 *   `__POCKET_APPS__` (launcher). `installable: false`: no web app manifest (launcher).
 */
export function createAppConfig(configUrl, options = {}) {
  const appDir = fileURLToPath(new URL(".", configUrl));
  const app = readAppInfo(appDir);

  return defineConfig({
    root: appDir,
    // Relative paths: the files work on GitHub Pages and from disk (file://, in the browser tests).
    base: "./",
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile(),
      appMetaPlugin(app),
      cspPlugin(app),
      pwaPlugin(app, { installable: options.installable !== false }),
    ],
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
