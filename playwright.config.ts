import { defineConfig, devices } from "@playwright/test";

// Browser tests for the built app files in release/.
// Run `pnpm e2e`. It builds the apps first.
const isCI = process.env.CI !== undefined;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // In CI, retry once to collect a trace, but still fail on a flaky test.
  // The HTML report goes into the artifact "playwright-report" when a test fails.
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
});
