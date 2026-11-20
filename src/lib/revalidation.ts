import type { RevalidationEvent } from "@probiz/sdk";
import { localizedHref, normalizePath, type LocaleSet } from "./locale";
import { TAG, menusTag, moduleTag, pageTag, siteTag } from "./tags";

export interface RevalidationPlan {
  /** Cache tags to expire. */
  tags: string[];
  /** Addresses (with their language prefix) of pages and route handlers to rebuild. */
  paths: string[];
  /** Everything is stale (the indexing switch moved): expire all CMS data and every page. */
  all: boolean;
  /** The root layout is stale (the header, footer and JSON-LD read the site settings): rebuild every page's shell. */
  layout: boolean;
}

const PAGE_EVENTS = new Set([
  "page.published",
  "page.unpublished",
  "page.updated",
  "page.moved",
  "page.deleted",
]);

/**
 * What a CMS event makes stale. `paths` in an event have no language prefix and are rebuilt in
 * every language of `locales`. The public menus follow the pages (their labels and addresses), so
 * page events refresh them too. Blog events are not handled: this site has no blog.
 */
export function planRevalidation(event: RevalidationEvent, set: LocaleSet): RevalidationPlan {
  const locales = event.locales.length > 0 ? event.locales : [...set.locales];
  const tags = new Set<string>();
  const paths = new Set<string>();

  const addPagePaths = (extraTags: boolean) => {
    for (const rawPath of event.paths) {
      if (!rawPath.startsWith("/")) continue;
      const path = normalizePath(rawPath);
      for (const locale of locales) {
        paths.add(localizedHref(locale, path, set.defaultLocale));
        if (extraTags) tags.add(pageTag(locale, path));
      }
    }
  };

  const type = event.type;
  let layout = false;
  if (PAGE_EVENTS.has(type)) {
    // `paths` is the list of every live address the proxy keeps (lib/paths.ts): a page that came or went changes it.
    tags.add(TAG.paths);
    tags.add(TAG.menus);
    tags.add(TAG.sitemap);
    addPagePaths(true);
  } else if (type === "module.updated") {
    // A record of an optional module changed: everything that was read with its tag rebuilds, and
    // `paths` (the pages that hold the module's block) in every language of `locales`.
    for (const key of event.modules ?? []) {
      if (/^[a-z][a-z0-9_-]*$/i.test(key)) tags.add(moduleTag(key));
    }
    tags.add(TAG.paths);
    tags.add(TAG.sitemap);
    addPagePaths(true);
  } else if (type === "settings.updated") {
    const groups = event.groups && event.groups.length > 0 ? event.groups : undefined;
    // The blog's texts are the only group this site does not read.
    if (!groups || groups.some((group) => group !== "blog")) {
      // The business, brand, legal, integration, localization and language settings are read by the
      // header, the footer and the JSON-LD of every page.
      layout = true;
      tags.add(TAG.site);
      for (const locale of set.locales) tags.add(siteTag(locale));
      // Languages decide which addresses exist and which carry a prefix.
      if (!groups || groups.includes("languages")) tags.add(TAG.paths);
    }
  } else if (type === "menu.updated") {
    tags.add(TAG.menus);
    for (const locale of locales) tags.add(menusTag(locale));
  } else if (type === "form.updated") {
    tags.add(TAG.forms);
    addPagePaths(true);
  } else if (type === "redirects.updated") {
    // The proxy asks the API on every request (its own short memory cache expires by time); what
    // the website cached from `resolveRedirect` goes here.
    tags.add(TAG.redirects);
    addPagePaths(false);
  } else if (type === "seo.settings.updated") {
    tags.add(TAG.robots);
    tags.add(TAG.sitemap);
    paths.add("/robots.txt");
    paths.add("/sitemap.xml");
  }
  // `form.submitted`, `webhook.test` and the blog's events leave nothing to refresh.

  // A full refresh (the indexing switch moved) takes the site data too.
  if (event.all === true) {
    for (const tag of [TAG.all, TAG.site, TAG.menus, TAG.pages, TAG.sitemap, TAG.robots])
      tags.add(tag);
    for (const locale of set.locales) {
      tags.add(siteTag(locale));
      tags.add(menusTag(locale));
    }
  }
  return { tags: [...tags], paths: [...paths], all: event.all === true, layout };
}
