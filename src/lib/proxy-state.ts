import { TtlCache } from "./ttl-cache";
import type { LocaleSet } from "./locale";
import type { RedirectDecision } from "./redirects";

// The proxy's short memories (what an address is: a page, a redirect, nothing; the list of live
// addresses), kept on `globalThis` so the revalidation route (another module graph in the same
// process) can clear them when the CMS says a page, a post or a redirect changed.
// With several website instances each keeps its own: the lifetimes below bound a missed clear.

export const VERDICT_TTL_MS = 30_000;

interface State {
  verdicts: TtlCache<{ kind: "live" } | { kind: "missing" } | RedirectDecision>;
  languages: TtlCache<LocaleSet>;
  /** The list of live addresses (lib/paths.ts), under one key. */
  paths: TtlCache<ReadonlySet<string>>;
  /** Set for a short while after the list could not be read, so a missing endpoint costs one try per half minute. */
  pathsUnavailable: TtlCache<true>;
  /** The read of the list in progress, shared by concurrent requests. */
  loading: Promise<ReadonlySet<string> | null> | undefined;
  /** Goes up when the memories are cleared, so a read that started before is not stored. */
  generation: number;
}

const KEY = Symbol.for("probiz.web.proxy-state");
const holder = globalThis as unknown as Record<symbol, State | undefined>;

export function proxyState(): State {
  holder[KEY] ??= {
    verdicts: new TtlCache(VERDICT_TTL_MS, 1000),
    languages: new TtlCache(60_000, 1),
    paths: new TtlCache(5 * 60_000, 1),
    pathsUnavailable: new TtlCache(VERDICT_TTL_MS, 1),
    loading: undefined,
    generation: 0,
  };
  return holder[KEY];
}

/** Forgets every verdict, the language list and the list of live addresses. */
export function clearProxyState(): void {
  const state = proxyState();
  state.verdicts.clear();
  state.languages.clear();
  state.paths.clear();
  state.pathsUnavailable.clear();
  state.loading = undefined;
  state.generation += 1;
}
