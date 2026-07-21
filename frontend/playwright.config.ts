import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"], ["./tests/e2e/completion-reporter.mjs"]],
  use: {
    baseURL: "http://127.0.0.1:8099",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
