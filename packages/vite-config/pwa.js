// The parts that make an app installable (a Progressive Web App): the icons, the web app manifest
// and the service worker. See "Apps as installable PWAs" in docs/decisions.md.
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import { z } from "zod";

const require = createRequire(import.meta.url);

/**
 * The page colors of the theme (`--background` in globals.css) as hex, for the manifest. The same
 * values are in packages/core/src/app-shell/theme.ts.
 */
export const THEME_COLORS = { light: "#ffffff", dark: "#0c0a09" };

/** The file of the service worker in release/. One worker for all apps and the launcher. */
export const SERVICE_WORKER_FILE = "sw.js";

const iconSetSchema = z.object({
  width: z.number(),
  height: z.number(),
  icons: z.record(z.string(), z.object({ body: z.string() })),
  // An alias can also turn or flip its parent. Then it has more fields than "parent".
  aliases: z.record(z.string(), z.looseObject({ parent: z.string() })).optional(),
});
const charsSchema = z.record(z.string(), z.string());

/** The Noto emoji as SVG (Apache-2.0), in the format of Iconify. `noto()` loads them once. */
let notoSet = null;

function noto() {
  notoSet ??= {
    icons: iconSetSchema.parse(require("@iconify-json/noto/icons.json")),
    chars: charsSchema.parse(require("@iconify-json/noto/chars.json")),
  };
  return notoSet;
}

/**
 * The SVG of one emoji, as an inner `<svg>` element with its own viewBox. Stops the build if the
 * Noto set does not have the emoji.
 *
 * @param {string} emoji
 * @returns {string}
 */
function emojiSvg(emoji) {
  const { icons, chars } = noto();
  // The Noto set writes the code points in hex with "-", mostly without the variation selector.
  const codes = [...emoji].map((char) => String(char.codePointAt(0)?.toString(16)));
  const withoutSelector = codes.filter((code) => code !== "fe0f");
  let name = chars[codes.join("-")] ?? chars[withoutSelector.join("-")];
  const alias = name === undefined ? undefined : icons.aliases?.[name];
  // Only a plain alias: a turned or flipped image would need a transform.
  if (alias !== undefined) name = Object.keys(alias).length === 1 ? alias.parent : undefined;
  const icon = name === undefined ? undefined : icons.icons[name];
  if (icon === undefined) {
    throw new Error(`The Noto emoji set has no image for "${emoji}". Pick another emoji.`);
  }
  return `<svg viewBox="0 0 ${String(icons.width)} ${String(icons.height)}">${icon.body}</svg>`;
}

/** The width and height of the drawing before it becomes a PNG. */
const DRAWING_SIZE = 512;

/**
 * The icons of each app. Each is a square PNG in release/icons/.
 * - `any`: rounded corners, for the computer and the browser tab.
 * - `maskable`: no corners and a smaller emoji. Android cuts the icon to its own shape and keeps
 *   only the circle in the middle (80 % of the width).
 * - `apple`: no corners. iOS rounds the corners itself. Not in the manifest.
 * `radius` and `emojiShare` are parts of the width.
 */
const ICONS = [
  { purpose: "any", size: 192, radius: 0.22, emojiShare: 0.64 },
  { purpose: "any", size: 512, radius: 0.22, emojiShare: 0.64 },
  { purpose: "maskable", size: 512, radius: 0, emojiShare: 0.5 },
  { purpose: "apple", size: 180, radius: 0, emojiShare: 0.62 },
];

/**
 * The file of an icon, relative to release/.
 *
 * @param {string} name The app name.
 * @param {(typeof ICONS)[number]} icon
 */
function iconFile(name, icon) {
  return icon.purpose === "maskable"
    ? `icons/${name}-maskable-${String(icon.size)}.png`
    : `icons/${name}-${String(icon.size)}.png`;
}

/**
 * Draws one icon of an app: the emoji on a light background.
 *
 * @param {string} emoji
 * @param {(typeof ICONS)[number]} icon
 * @returns {Buffer} The PNG file.
 */
function renderIcon(emoji, { size, radius, emojiShare }) {
  const emojiSize = DRAWING_SIZE * emojiShare;
  const offset = (DRAWING_SIZE - emojiSize) / 2;
  const full = String(DRAWING_SIZE);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}">`,
    '<defs><linearGradient id="pocket-apps-bg" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e7e5e4"/>',
    "</linearGradient></defs>",
    `<rect width="${full}" height="${full}" rx="${String(DRAWING_SIZE * radius)}" fill="url(#pocket-apps-bg)"/>`,
    emojiSvg(emoji).replace(
      "<svg ",
      `<svg x="${String(offset)}" y="${String(offset)}" width="${String(emojiSize)}" height="${String(emojiSize)}" `,
    ),
    "</svg>",
  ].join("");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

/**
 * The web app manifest of one app. Each app is its own installed app: the scope is only the page
 * of the app. The paths are relative to the manifest file in release/.
 *
 * @param {import("./index.d.ts").AppInfo} app
 */
function manifestOf(app) {
  const page = `./${app.name}.html`;
  return {
    name: app.title,
    short_name: app.title,
    description: app.description,
    lang: "de",
    dir: "ltr",
    start_url: page,
    scope: page,
    display: "standalone",
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: ICONS.filter((icon) => icon.purpose !== "apple").map((icon) => ({
      src: iconFile(app.name, icon),
      sizes: `${String(icon.size)}x${String(icon.size)}`,
      type: "image/png",
      purpose: icon.purpose,
    })),
  };
}

// Registers the one service worker of the site. It fails without a web server (file://) and in
// `vite preview`: then the page works as before, only without the offline copy.
const REGISTER_SCRIPT = `if ("serviceWorker" in navigator) addEventListener("load", () => { navigator.serviceWorker.register("./${SERVICE_WORKER_FILE}").catch(() => undefined); });`;

/**
 * Adds the icons, the theme color and the service worker to the built page. With `installable`,
 * also the web app manifest. Only for the build: the dev server has no service worker.
 *
 * @param {import("./index.d.ts").AppInfo} app
 * @param {{ installable: boolean }} options
 * @returns {import("vite").Plugin}
 */
export function pwaPlugin(app, { installable }) {
  const [tabIcon, , , appleIcon] = ICONS;
  return {
    name: "pocket-apps:pwa",
    apply: "build",
    transformIndexHtml() {
      return [
        { tag: "meta", attrs: { name: "theme-color", content: THEME_COLORS.light } },
        {
          tag: "link",
          attrs: { rel: "icon", type: "image/png", href: `./${iconFile(app.name, tabIcon)}` },
        },
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", href: `./${iconFile(app.name, appleIcon)}` },
        },
        ...(installable
          ? [{ tag: "link", attrs: { rel: "manifest", href: `./${app.name}.webmanifest` } }]
          : []),
        { tag: "script", children: REGISTER_SCRIPT, injectTo: "body" },
      ].map((tag) => ({ injectTo: "head", ...tag }));
    },
    generateBundle() {
      for (const icon of ICONS) {
        const fileName = iconFile(app.name, icon);
        this.emitFile({ type: "asset", fileName, source: renderIcon(app.emoji, icon) });
      }
      if (installable) {
        const source = `${JSON.stringify(manifestOf(app), null, 2)}\n`;
        this.emitFile({ type: "asset", fileName: `${app.name}.webmanifest`, source });
      }
    },
  };
}
