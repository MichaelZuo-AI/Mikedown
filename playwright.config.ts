import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  webServer: {
    command: "pnpm dev",
    port: 1420,
    reuseExistingServer: true,
  },
});
