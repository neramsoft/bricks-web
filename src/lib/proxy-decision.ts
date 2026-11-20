import { getPage, getSite, isProbizApiError, resolveRedirect } from "@probiz/sdk";
import { splitPathname, type LocaleSet, type ParsedRoute } from "./locale";
import { livePaths, pathKey } from "./paths";
import { proxyBulkClient, proxyClient } from "./proxy-client";
import { proxyState } from "./proxy-state";
import { decideRedirect, type RedirectDecision } from "./redirects";

// What an address is, decided before anything renders (src/proxy.ts calls this):
//  - a live address (a page of the CMS): it goes on to the cached page route. "Live" is one
//    cached list of every public address (lib/paths.ts); an API without that list is asked about
//    the address itself;
//  - a CMS redirect (301, 302) or a gone address (410): answered by the proxy, because a page
//    render can't send those (Next renders a redirect as 307 or 308 and has no 410);
//  - anything else is missing.
// A page that is live always wins over a redirect from the same address. The verdict of an
// address is remembered for a short time (lib/proxy-state.ts); the revalidation webhook forgets
// them at once.

export type Verdict = { kind: "live" } | { kind: "missing" } | RedirectDecision;

/** The site's languages, remembered for a minute. */
export async function localeSet(): Promise<LocaleSet> {
  const { languages } = proxyState();
  const cached = languages.get("set");
  if (cached) return cached;
  const site = await getSite(proxyClient());
  const set = { defaultLocale: site.defaultLocale, locales: site.languages.map((l) => l.code) };
  languages.set("set", set);
  return set;
}

/** The one-address lookup, for an API that has no list of live addresses. */
async function lookupIsLive(route: ParsedRoute): Promise<boolean> {
  try {
    await getPage(proxyClient(), { locale: route.locale, path: route.path });
    return true;
  } catch (error) {
    if (isProbizApiError(error) && error.status === 404) return false;
    throw error;
  }
}

async function pageIsLive(url: URL): Promise<boolean> {
  const route = splitPathname(url.pathname, await localeSet());
  // The default language's own prefix (`/bs/...`) is nobody's address.
  if (!route) return false;
  const live = await livePaths(proxyBulkClient());
  if (live) return live.has(pathKey(route.locale, route.path));
  return lookupIsLive(route);
}

/** What the address is. Throws when the API cannot be asked: the proxy then lets the request through. */
export async function classify(url: URL): Promise<Verdict> {
  const { verdicts } = proxyState();
  const cached = verdicts.get(url.pathname);
  if (cached) return cached;
  let verdict: Verdict = { kind: "live" };
  if (!(await pageIsLive(url))) {
    const requested = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const redirect = decideRedirect(await resolveRedirect(proxyClient(), requested), url);
    verdict = redirect ?? { kind: "missing" };
  }
  verdicts.set(url.pathname, verdict);
  return verdict;
}
