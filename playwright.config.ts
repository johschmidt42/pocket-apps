import { defineConfig, devices } from "@playwright/test";

// Browser tests for the built app files in release/.
// Run `pnpm e2e`. It builds the apps first.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: "list",
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
});
