import process from "node:process";

import { defineConfig } from "@playwright/test";

import e2eConfig from "./playwright.config";

const baseURL = "http://127.0.0.1:4176";

export default defineConfig({
  ...e2eConfig,
  testDir: "./src",
  testMatch: "**/__tests__/*.ct.spec.ts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/ct" }]],
  outputDir: "test-results/ct",
  use: {
    ...e2eConfig.use,
    baseURL,
    serviceWorkers: "block",
    reuseContext: true,
  },
  webServer: {
    command: "bun --no-env-file ./playwright/index.html --host=127.0.0.1 --port=4176",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
