import { createProbizClient, type ProbizClient } from "@probiz/sdk";
import { env } from "./env";

// The proxy's own client: no Next data cache (it decides before a page renders), a short
// timeout (a slow API must not hold up every page), no `server-only` (the proxy is not a server component).

let client: ProbizClient | undefined;
let bulkClient: ProbizClient | undefined;

export function proxyClient(): ProbizClient {
  client ??= createProbizClient({
    baseUrl: env().API_URL,
    fetch: (input) =>
      fetch(input as Request, { cache: "no-store", signal: AbortSignal.timeout(2000) }),
  });
  return client;
}

/** For the list of every live address, which is read in pages and read once in five minutes: a longer timeout. */
export function proxyBulkClient(): ProbizClient {
  bulkClient ??= createProbizClient({
    baseUrl: env().API_URL,
    fetch: (input) =>
      fetch(input as Request, { cache: "no-store", signal: AbortSignal.timeout(8000) }),
  });
  return bulkClient;
}
