// ESLint flat config for the whole monorepo.
// Many rules in AGENTS.md are enforced here. Never weaken a rule to make a check pass.
import css from "@eslint/css";
import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import html from "@html-eslint/eslint-plugin";
import vitest from "@vitest/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import { tailwind4 } from "tailwind-csstree";
import { listApps } from "./packages/vite-config/index.js";
import tseslint from "typescript-eslint";

// Apps must not use browser storage. The data file in @pocket-apps/core is the only storage.
const STORAGE_GLOBALS = [
  {
    name: "localStorage",
    message:
      "Use the data file from @pocket-apps/core. localStorage is not reliable under file://.",
  },
  { name: "sessionStorage", message: "Use the data file from @pocket-apps/core." },
];

// Apps with "pocketApp.network": false must not use the network.
const NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
  name,
  message:
    'This app has "pocketApp.network": false. Set it to true in package.json to use the internet.',
}));

const offlineApps = listApps().filter((app) => !app.network);

export default defineConfig([
  globalIgnores([
    "**/dist/",
    "**/coverage/",
    "release/",
    "pnpm-lock.yaml",
    // shadcn components are vendor code. We use them without changes.
    "packages/ui/src/components/",
  ]),

  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },

  // JSON. tsconfig files allow comments (JSONC).
  {
    files: ["**/*.json"],
    ignores: ["**/tsconfig*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/tsconfig*.json"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },

  // Markdown (GitHub flavor).
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },

  // CSS with Tailwind v4 syntax.
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    languageOptions: { customSyntax: tailwind4, tolerant: false },
    extends: ["css/recommended"],
  },

  // HTML (the index.html of each app). Prettier does the formatting, so the format rules are off.
  {
    files: ["**/*.html"],
    ...html.configs["flat/recommended"],
  },
  {
    files: ["**/*.html"],
    rules: {
      "@html-eslint/indent": "off",
      "@html-eslint/no-extra-spacing-tags": "off",
      "@html-eslint/attrs-newline": "off",
      "@html-eslint/require-closing-tags": ["error", { selfClosing: "always" }],
      "@html-eslint/require-lang": "error",
      "@html-eslint/require-title": "error",
      "@html-eslint/require-meta-charset": "error",
      "@html-eslint/require-meta-viewport": "error",
    },
  },

  // Plain JavaScript files: scripts and configs.
  {
    files: ["**/*.{js,mjs}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // TypeScript and React.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Use named exports. Only config files may use a default export.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use Tailwind classes. No inline styles.",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Do not use dangerouslySetInnerHTML.",
        },
      ],
    },
  },

  // Apps: architecture boundaries.
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "launcher/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps/**", "../../*"],
              message: "Apps import only from packages/*, never from other apps.",
            },
            {
              group: ["*.css", "!@pocket-apps/ui/globals.css"],
              message: "No own CSS. Use Tailwind classes.",
            },
            {
              group: ["radix-ui", "@radix-ui/*"],
              message: "Use the components from @pocket-apps/ui.",
            },
            {
              group: [
                "redux",
                "@reduxjs/*",
                "zustand",
                "jotai",
                "react-router*",
                "@tanstack/react-router",
              ],
              message:
                "No state or router libraries. Use useState/useReducer and the data hook from core.",
            },
          ],
        },
      ],
      "no-restricted-globals": ["error", ...STORAGE_GLOBALS],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "showOpenFilePicker",
          message: "Use @pocket-apps/core/data-file.",
        },
        {
          object: "window",
          property: "showSaveFilePicker",
          message: "Use @pocket-apps/core/data-file.",
        },
        { object: "window", property: "localStorage", message: "Use @pocket-apps/core/data-file." },
      ],
    },
  },

  // Offline apps (and the launcher): no network access.
  {
    files: [
      "launcher/src/**/*.{ts,tsx}",
      ...offlineApps.map((app) => `apps/${app.name}/src/**/*.{ts,tsx}`),
    ],
    rules: {
      "no-restricted-globals": ["error", ...STORAGE_GLOBALS, ...NETWORK_GLOBALS],
    },
  },

  // Config files need a default export.
  {
    files: ["**/*.config.{ts,js}"],
    rules: { "no-restricted-syntax": "off" },
  },

  // Browser tests (Playwright). Like unit tests, they may use type assertions.
  {
    files: ["e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
    },
  },

  // Tests.
  {
    files: ["**/*.test.{ts,tsx}"],
    extends: [vitest.configs.recommended, testingLibrary.configs["flat/react"]],
    rules: {
      // Tests may build fake objects with type assertions.
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
]);
