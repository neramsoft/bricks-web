// Languages in the URL (docs/decisions/0013 #5, 0028). The default language has no prefix, every
// other enabled language has its code: `/about` (bs), `/en/about`, `/de/about`. The languages
// themselves come from the CMS, never from this file.

export interface LocaleSet {
  defaultLocale: string;
  /** Every enabled language code, the default one included. */
  locales: readonly string[];
}

export interface ParsedRoute {
  locale: string;
  /** The page address in that language, without the prefix: `/`, `/usluge/web-stranice`. */
  path: string;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** `["a", "", "b/"]` becomes `/a/b`; nothing becomes `/`. Case is kept (the API folds it). */
export function normalizePath(path: string): string {
  const parts = path.split("/").filter((part) => part.length > 0);
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

/**
 * Reads the URL segments of the catch-all route. A first segment that is the code of an enabled,
 * non-default language is the language; anything else belongs to the default language. The
 * default language's own code as a prefix (`/bs/about`) is not an address of the site: null, so
 * the page is a 404 and the prefixed copy of a page is never indexed.
 */
export function parseRoute(
  segments: readonly string[] | undefined,
  { defaultLocale, locales }: LocaleSet,
): ParsedRoute | null {
  const decoded = (segments ?? []).map(safeDecode);
  const [first, ...rest] = decoded;
  if (first !== undefined) {
    const code = first.toLowerCase();
    if (code === defaultLocale.toLowerCase()) return null;
    const match = locales.find((locale) => locale.toLowerCase() === code);
    if (match) return { locale: match, path: normalizePath(rest.join("/")) };
  }
  return { locale: defaultLocale, path: normalizePath(decoded.join("/")) };
}

/** The public address of a path in a language: no prefix for the default language. */
export function localizedHref(locale: string, path: string, defaultLocale: string): string {
  const clean = normalizePath(path);
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** An absolute address on the site. `href` is a path with its prefix, or already absolute. */
export function absoluteUrl(siteUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `${siteUrl.replace(/\/+$/, "")}${href.startsWith("/") ? href : `/${href}`}`;
}

/** Splits a requested pathname (with its prefix) into the language and the page path. */
export function splitPathname(pathname: string, set: LocaleSet): ParsedRoute | null {
  return parseRoute(
    pathname.split("/").filter((part) => part.length > 0),
    set,
  );
}
