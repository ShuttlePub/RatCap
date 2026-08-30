import { defineConfig } from "@playwright/test";

// The stack (postgres/minio/core/web) is started externally by
// scripts/e2e.sh via docker compose — there is deliberately no webServer here.
// workers: 1 because all tests share one account's server-side quota state.
//
// PLAYWRIGHT_CHROMIUM_PATH: hosts where the downloaded browser cannot start
// (e.g. NixOS without libgbm) point this at a system chromium. Unset in CI,
// where the Playwright-downloaded browser is used.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  workers: 1,
  retries: 0,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3210",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
});
