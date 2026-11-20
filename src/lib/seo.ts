import { absoluteUrl } from "./locale";

export interface AlternateLike {
  locale: string;
  href: string;
}

/**
 * `hreflang` for a page: only the translations that exist (the page answer's `alternates`), each
 * with an absolute address, plus `x-default` for the default language's. Nothing when there is
 * no translation to point to, or when the site switched `hreflang` off.
 */
export function hreflangLanguages(
  alternates: readonly AlternateLike[],
  options: { siteUrl: string; defaultLocale: string; enabled?: boolean },
): Record<string, string> | undefined {
  if (options.enabled === false || alternates.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const alternate of alternates) {
    languages[alternate.locale] = absoluteUrl(options.siteUrl, alternate.href);
  }
  const fallback = alternates.find((alternate) => alternate.locale === options.defaultLocale);
  if (fallback) languages["x-default"] = absoluteUrl(options.siteUrl, fallback.href);
  return languages;
}

/** The CMS's canonical override when it has one, otherwise the page's own address. */
export function canonicalUrl(options: {
  siteUrl: string;
  href: string;
  override?: string | null;
}): string {
  return options.override ? options.override : absoluteUrl(options.siteUrl, options.href);
}

/**
 * The document title: the page's SEO title and the site name, once. The home page and a title that
 * already carries the name stand alone.
 */
export function documentTitle(options: {
  title: string;
  siteName: string | null;
  isHome: boolean;
}): string {
  const { title, siteName, isHome } = options;
  if (!siteName || isHome) return title;
  if (title.toLowerCase().includes(siteName.toLowerCase())) return title;
  return `${title} | ${siteName}`;
}

/** What the page tells robots: `noindex` when the CMS says so (or for a preview), links followed. */
export function robotsFor(noindex: boolean): { index: boolean; follow: boolean } {
  return { index: !noindex, follow: true };
}
