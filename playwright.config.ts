import { defineConfig, devices } from "@playwright/test";

// Bare `next` would go through npm's .cmd shim, which breaks on the "&" in this folder's name.
const next = "node node_modules/next/dist/bin/next start -p";
const env = { ADMIN_PASSWORD: "e2e-admin-pass", INSECURE_COOKIES: "1" };

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  reporter: "line",
  use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 }, baseURL: "http://localhost:3218" },
  webServer: [
    { command: `${next} 3218`, url: "http://localhost:3218", reuseExistingServer: false, env: { ...env, DB_PATH: "data/e2e.db" } },
    { command: `${next} 3219`, url: "http://localhost:3219", reuseExistingServer: false, env: { ...env, DB_PATH: "data/e2e-empty.db" } },
  ],
});
