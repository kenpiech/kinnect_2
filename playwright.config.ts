import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local the same way `next dev` does, so the Clerk keys reach the
// test process without anyone opening the file.
loadEnvConfig(process.cwd());

// End-to-end tests: tests/privacy.spec.ts proves two kinnect users who aren't
// friends can't see each other's data; tests/likes-comments.spec.ts checks
// likes and comments between friends. It runs against the local dev server, signed
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
    // A stuck click fails in 15 s instead of using up the whole test, so each
    // test's cleanup (in finally) still has time to run
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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
