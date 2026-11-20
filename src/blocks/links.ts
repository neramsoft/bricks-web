import { dialable } from "@/lib/format";
import type { ResolvedLink } from "./types";

/**
 * Where a link goes. The API resolves `href` for every link (a page link follows renames and
 * translations, and is null when the page is not live); an address a client built without one
 * falls back to the stored value. Null: draw the text without a link.
 */
export function linkHref(link: ResolvedLink | null | undefined): string | null {
  if (!link) return null;
  if (typeof link.href === "string" && link.href !== "") return link.href;
  if (link.href === null && link.type === "page") return null;
  switch (link.type) {
    case "url":
      return link.url;
    case "email":
      return `mailto:${link.address}`;
    case "phone":
      return `tel:${dialable(link.number)}`;
    case "anchor":
      return `#${link.anchorId}`;
    default:
      return null;
  }
}

/** True for an address on this site (a path), false for another site, `mailto:`, `tel:` and fragments. */
export const isInternal = (href: string): boolean => href.startsWith("/") && !href.startsWith("//");

/** Opens in a new tab: only `url` and `page` links carry the flag. */
export function opensInNewTab(link: ResolvedLink | null | undefined): boolean {
  return !!link && (link.type === "url" || link.type === "page") && link.newTab === true;
}
