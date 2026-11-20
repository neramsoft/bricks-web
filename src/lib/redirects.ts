import type { PublicRedirect } from "@probiz/sdk";

export type RedirectDecision =
  { kind: "redirect"; status: 301 | 302; location: string } | { kind: "gone" };

/**
 * What to answer for a CMS redirect (docs/decisions/0024 R11): 301 or 302 with an absolute
 * `Location` built on the request, or 410. A target that would send the visitor to the address
 * they asked for, or that is not http(s), is ignored (the site shows its 404).
 */
export function decideRedirect(
  redirect: PublicRedirect | null,
  request: URL,
): RedirectDecision | null {
  if (!redirect) return null;
  if (redirect.code === 410) return { kind: "gone" };
  if (!redirect.location) return null;
  let target: URL;
  try {
    target = new URL(redirect.location, request);
  } catch {
    return null;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null;
  if (target.origin === request.origin && target.pathname === request.pathname) return null;
  return { kind: "redirect", status: redirect.code, location: target.toString() };
}
