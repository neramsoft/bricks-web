import { defineConfig } from "@playwright/test";

// The site, built (`pnpm build` first), against the fixture API (e2e/support): no CMS, no
// database, nothing from the network. Ports are not the development ones, so a running `pnpm dev`
// is left alone. Screenshots go to test-results/screenshots at 1440 x 900 and 390 x 844.

export const API_PORT = 4010;
export const WEB_PORT = 4011;
const api = `http://127.0.0.1:${API_PORT}`;
const web = `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: web,
    viewport: { width: 1440, height: 900 },
    // The page's motion is a fade-in of what is below the fold; at rest it is complete.
    contextOptions: { reducedMotion: "reduce" },
    locale: "bs-BA",
    timezoneId: "Europe/Sarajevo",
    launchOptions: {
      // Set where the browser was not installed by `playwright install` (a sandbox).
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    },
  },
  webServer: [
    {
      command: `node e2e/support/run-fixture-api.ts ${API_PORT}`,
      url: `${api}/v1/public/site`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm exec next start --port ${WEB_PORT}`,
      url: `${web}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        API_URL: api,
        PUBLIC_API_URL: api,
        SITE_URL: web,
        MEDIA_PUBLIC_URL: api,
        REVALIDATE_SECRET: "whsec_playwright_fixture_secret",
      },
    },
  ],
});
