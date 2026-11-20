import "server-only";
import { cache } from "react";
import {
  getEnabledModules,
  getForm,
  getMenus,
  getPage,
  getSite,
  isProbizApiError,
  type PublicForm,
  type PublicMenus,
  type PublicPage,
  type PublicSite,
} from "@probiz/sdk";
import { cms, cmsUncached } from "./api";
import { parseRoute, type ParsedRoute } from "./locale";

// The CMS data a page needs. `cache` shares one read between the layout, the metadata and the
// page of one request.

const isMissing = (error: unknown) => isProbizApiError(error) && error.status === 404;

export const getSiteData = cache(async (locale?: string): Promise<PublicSite> => {
  return getSite(cms(), locale);
});

export const getMenusData = cache(async (locale: string): Promise<PublicMenus> => {
  return getMenus(cms(), locale);
});

/**
 * The optional modules that are switched on (tagged with the site's settings, so it is read
 * again with them); null when the API could not say (a page then does not guess).
 */
export const getModulesData = cache(async (): Promise<string[] | null> => {
  try {
    return await getEnabledModules(cms());
  } catch {
    return null;
  }
});

/** A published page, or null when there is none at this address in this language. */
export const getPageData = cache(
  async (locale: string, path: string): Promise<PublicPage | null> => {
    try {
      return await getPage(cms(), { locale, path });
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  },
);

/** An enabled form to draw (tagged `forms`, refreshed on `form.updated`); null for a disabled or missing one. */
export const getFormData = cache(async (id: string): Promise<PublicForm | null> => {
  try {
    return await getForm(cms(), id);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
});

/** The draft behind a preview token; null for a token that is expired, wrong, or for another page. */
export async function getPreviewPage(
  token: string,
  locale: string,
  path: string,
): Promise<PublicPage | null> {
  try {
    return await getPage(cmsUncached(), { locale, path, preview: token });
  } catch (error) {
    if (isProbizApiError(error) && (error.status === 401 || error.status === 404)) return null;
    throw error;
  }
}

export interface RouteContext {
  defaultLocale: string;
  locales: string[];
  languages: PublicSite["languages"];
  /** Null when the address is not one of the site's (the default language's own prefix). */
  route: ParsedRoute | null;
}

/** The site's languages and what the requested segments mean. Keyed by a string so it is shared per request. */
export const getRouteContext = cache(async (key: string): Promise<RouteContext> => {
  const site = await getSiteData();
  const locales = site.languages.map((language) => language.code);
  const segments = key === "" ? [] : key.split("/");
  const route = parseRoute(segments, { defaultLocale: site.defaultLocale, locales });
  return { defaultLocale: site.defaultLocale, locales, languages: site.languages, route };
});

export const routeKey = (segments: string[] | undefined) => (segments ?? []).join("/");
