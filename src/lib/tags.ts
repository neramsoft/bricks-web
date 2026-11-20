import { normalizePath } from "./locale";

// Cache tags of the CMS data. Every cached public API read carries them, and the revalidation
// webhook (lib/revalidation.ts) expires them.

export const TAG = {
  all: "cms",
  site: "site",
  menus: "menus",
  pages: "pages",
  forms: "forms",
  paths: "paths",
  sitemap: "sitemap",
  robots: "robots",
  redirects: "redirects",
} as const;

/**
 * The optional modules whose records pages draw. A page's answer holds the records of its module
 * blocks, and which blocks a page has is only known after the read, so every page read follows
 * every module. Add a key when the CMS adds a module.
 */
export const MODULE_KEYS = [
  "services",
  "team",
  "testimonials",
  "faq",
  "portfolio",
  "gallery",
  "careers",
  "locations",
  "catalog",
  "pricing",
  "events",
  "bookings",
  "menu",
  "listings",
  "newsletter",
  "search",
] as const;
export const moduleTag = (key: string) => `module:${key}`;

export const siteTag = (locale: string) => `site:${locale}`;
export const menusTag = (locale: string) => `menus:${locale}`;

/** The tag of one page in one language; the path has no language prefix, case is folded as the API does. */
export function pageTag(locale: string, path: string): string {
  return `page:${locale}:${normalizePath(path).toLowerCase()}`;
}

/** The tags of a public API request, from its address. */
export function tagsForRequest(url: URL): string[] {
  const locale = url.searchParams.get("locale") ?? "default";
  const path = url.searchParams.get("path") ?? "/";
  const tags: string[] = [TAG.all];
  const route = url.pathname.replace(/^\/v1\/public/, "");
  if (route === "/site") tags.push(TAG.site, siteTag(locale));
  else if (route === "/menus") tags.push(TAG.menus, menusTag(locale));
  // The modules that are on follow the site's settings.
  else if (route === "/modules") tags.push(TAG.site);
  else if (route === "/pages/sitemap") tags.push(TAG.sitemap);
  else if (route === "/pages") {
    // A contact form on the page carries the human check of the forms' settings, which a
    // `form.updated` event announces: pages follow the forms too.
    tags.push(TAG.pages, pageTag(locale, path), TAG.forms, ...MODULE_KEYS.map(moduleTag));
  } else if (route.startsWith("/restaurant-menus")) {
    // A menu's page names the location that serves it; the list is the menu module's alone.
    tags.push(moduleTag("menu"));
    if (route.startsWith("/restaurant-menus/by-slug/")) tags.push(moduleTag("locations"));
  } else if (route.startsWith("/events")) {
    // An event names its location and its performers, and its registration form carries the
    // human check of the forms' settings.
    tags.push(moduleTag("events"), moduleTag("locations"));
    if (route.startsWith("/events/by-slug/")) tags.push(moduleTag("team"), TAG.forms);
  } else if (route.startsWith("/locations")) {
    // A location's page lists its services and its team: it follows those modules too.
    tags.push(moduleTag("locations"));
    if (route.startsWith("/locations/by-slug/"))
      tags.push(moduleTag("services"), moduleTag("team"));
  } else if (route.startsWith("/galleries")) {
    tags.push(moduleTag("gallery"));
  } else if (route === "/robots") tags.push(TAG.robots);
  else if (route.startsWith("/redirects")) tags.push(TAG.redirects);
  else if (route.startsWith("/forms")) tags.push(TAG.forms);
  else if (route.startsWith("/paths")) tags.push(TAG.paths);
  return tags;
}
