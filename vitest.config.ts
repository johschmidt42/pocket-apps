import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { testAppInfo } from "./packages/core/src/testing.ts";

// The app info that unit tests see as __POCKET_APP__.
const TEST_APP = testAppInfo({ name: "test-app", title: "Test-App", version: "0.0.0-test" });

const FULL = { lines: 100, functions: 100, branches: 100, statements: 100 };

export default defineConfig({
  plugins: [react()],
  define: {
    __POCKET_APP__: JSON.stringify(TEST_APP),
    __POCKET_APPS__: JSON.stringify([TEST_APP]),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "apps/*/src/**/*.test.{ts,tsx}",
      "launcher/src/**/*.test.{ts,tsx}",
      "packages/*/src/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**", "apps/*/src/**", "launcher/src/**"],
      exclude: ["**/*.test.*", "**/main.tsx", "**/*.d.ts"],
      thresholds: {
        // Shared logic and data schemas: every line, every branch.
        "packages/core/src/**": { ...FULL, perFile: true },
        "apps/*/src/schema.ts": FULL,
        "apps/*/src/migrations/**": FULL,
        // Everything else (app UI).
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
