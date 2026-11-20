import "server-only";
import { createProbizClient, type ProbizClient } from "@probiz/sdk";
import { env } from "./env";
import { tagsForRequest } from "./tags";

// Clients of the CMS API. The cached one tags each read for the revalidation webhook; a webhook
// missed for any reason is bounded by `REVALIDATE_SECONDS`.

export const REVALIDATE_SECONDS = 300;

let cachedClient: ProbizClient | undefined;
let plainClient: ProbizClient | undefined;

/** Reads for public pages: Next's data cache, tagged. */
export function cms(): ProbizClient {
  cachedClient ??= createProbizClient({
    baseUrl: env().API_URL,
    fetch: (input) => {
      const request = input as Request;
      return fetch(request, {
        next: { revalidate: REVALIDATE_SECONDS, tags: tagsForRequest(new URL(request.url)) },
      });
    },
  });
  return cachedClient;
}

/** Reads that must never be cached: previews, redirect lookups, the 404 report. */
export function cmsUncached(): ProbizClient {
  plainClient ??= createProbizClient({
    baseUrl: env().API_URL,
    fetch: (input) => fetch(input as Request, { cache: "no-store" }),
  });
  return plainClient;
}
