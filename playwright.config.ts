import { defineConfig, devices } from "@playwright/test";

// Never a hardcoded port: `bun run test:e2e` asks freeport for one.
const port = Number(process.env.E2E_PORT);
if (!Number.isInteger(port) || port <= 0) throw new Error("Set E2E_PORT, e.g. E2E_PORT=$(freeport) bunx playwright test");
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", locale: "en-US" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1000 } } }],
  // The production path: the static export served by the production server.
  webServer: {
    command: `bun run build && PORT=${port} LOG_LEVEL=warn bun src/server/main.ts`,
    url: `${baseURL}/healthz`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
