import { isIP } from "node:net";

// What a form submission trusts about the request that carries it (docs/decisions/0035 F5, F6).
// Pure functions: the route handlers read the headers and call these.

/**
 * The page the form was on, as the API wants it (docs/decisions/0023 P9): one leading `/`, no host,
 * query, fragment, backslash, space, `..` or control character, 300 at most. The hidden field
 * comes from the browser, so it is checked again here; anything else is `null` (no page path is
 * sent and the visitor goes back to the home page).
 */
export function cleanPagePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 300) return null;
  if (!/^\/[A-Za-z0-9\-._~%/]*$/.test(value)) return null;
  if (value.startsWith("//") || value.includes("..") || value.includes("//")) return null;
  return value;
}

/** The id of the element the visitor is sent back to (the form's wrapper); anything odd is dropped. */
export function cleanAnchor(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value) ? value : null;
}

function normalizeAddress(raw: string | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  // `[::1]:1234` and `203.0.113.7:1234`: a proxy that adds the port.
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
  if (bracketed) value = bracketed[1]!;
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value))
    value = value.slice(0, value.lastIndexOf(":"));
  if (value.toLowerCase().startsWith("::ffff:") && isIP(value.slice(7)) === 4)
    value = value.slice(7);
  return isIP(value) === 0 ? null : value;
}

/**
 * The visitor's address from `X-Forwarded-For`, given how many trusted proxies append to it.
 * Each proxy adds the address it saw to the right end, so the entry `hops` places from the right
 * is the first one a trusted proxy wrote; everything left of it is the visitor's own claim and is
 * never read. No trusted proxy (0), a shorter chain than expected, or an entry that is not an
 * address: null, and the API then sees the site's own address.
 */
export function visitorAddress(headers: Pick<Headers, "get">, hops: number): string | null {
  if (!Number.isInteger(hops) || hops < 1) return null;
  const entries = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length < hops) return null;
  return normalizeAddress(entries[entries.length - hops]);
}

/** The visitor's browser, without control characters and at the API's length (255). */
export function visitorAgent(headers: Pick<Headers, "get">): string | null {
  const value = (headers.get("user-agent") ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return value ? value.slice(0, 255) : null;
}

/**
 * Whether a form post comes from the site's own pages. A cross-site POST (a page of someone else
 * that submits to this address) is refused. `Origin` is sent by every current browser on a POST;
 * a request without it (a script, an old browser) is judged by `Sec-Fetch-Site` and otherwise let
 * through: the API's honeypot, timing and rate limits are what stop a script.
 */
export function isSameOrigin(headers: Pick<Headers, "get">, siteOrigin: string): boolean {
  const origin = headers.get("origin");
  if (origin !== null) {
    if (origin === siteOrigin) return true;
    // The site under another name (an alias, 127.0.0.1): the browser's Origin names the host it asked.
    try {
      return new URL(origin).host === headers.get("host");
    } catch {
      return false;
    }
  }
  const fetchSite = headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin" || fetchSite === "none";
}
