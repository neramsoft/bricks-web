import { getPaths, type ProbizClient, type PublicPath } from "@probiz/sdk";
import { normalizePath } from "./locale";
import { proxyState } from "./proxy-state";

// The list of every live public address (`GET /v1/public/paths`, docs/decisions/0032), which lets the
// proxy tell a live address from a missing one without a lookup per address (docs/decisions/0033).
// It holds pages, posts, the blog list, and the categories, tags and authors that have a live post,
// noindex ones included. It is kept in memory for five minutes, the tag `paths`
// of the data cache plays for a page: the revalidation route forgets it on every `page.*`,
// `post.*`, `category.*`, `tag.*` and `author.*` event (lib/revalidation.ts), the lifetime bounds a
// webhook that never came. The proxy cannot read the data cache, so the memory is the cache.

export const PATHS_TTL_MS = 5 * 60_000;

/** The key of an address in a language; case is folded as the API does. */
export function pathKey(locale: string, path: string): string {
  return `${locale}:${normalizePath(path).toLowerCase()}`;
}

export function indexPaths(items: readonly PublicPath[]): ReadonlySet<string> {
  return new Set(items.map((item) => pathKey(item.locale, item.path)));
}

/**
 * The live addresses, or null when the list cannot be had (an API without the endpoint, or not
 * answering): the proxy then asks about the address itself, as before. Concurrent callers share
 * one read.
 */
export async function livePaths(client: ProbizClient): Promise<ReadonlySet<string> | null> {
  const state = proxyState();
  const cached = state.paths.get("list");
  if (cached) return cached;
  if (state.pathsUnavailable.get("down")) return null;
  const generation = state.generation;
  const loading = (state.loading ??= (async () => {
    try {
      const set = indexPaths(await getPaths(client));
      // A clear in the meantime means the CMS changed something this read may not have seen.
      if (generation === state.generation) state.paths.set("list", set);
      return set;
    } catch {
      if (generation === state.generation) state.pathsUnavailable.set("down", true);
      return null;
    } finally {
      if (generation === state.generation) state.loading = undefined;
    }
  })());
  return loading;
}
