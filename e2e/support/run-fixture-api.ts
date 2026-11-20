import { startFixtureApi } from "./api-fixture.ts";

// Starts the fake CMS API for `playwright test` and for working on the site by hand
// (`node e2e/support/run-fixture-api.ts 4010`, then API_URL=http://127.0.0.1:4010 pnpm dev).
const port = Number(process.argv[2] ?? process.env.FIXTURE_API_PORT ?? 4010);
const api = await startFixtureApi(port);
console.log(`fixture API on http://127.0.0.1:${port}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void api.close().then(() => process.exit(0)));
}
