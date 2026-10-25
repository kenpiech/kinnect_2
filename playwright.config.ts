import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local the same way `next dev` does, so the Clerk keys reach the
// test process without anyone opening the file.
loadEnvConfig(process.cwd());

// One end-to-end test (tests/privacy.spec.ts) that proves two lib2 users
// can't see each other's data. It runs against the local dev server, signed
// in as two Clerk test users. Run: npm run test:e2e
export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    { name: "privacy", testMatch: /\.spec\.ts/, dependencies: ["setup"] },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
