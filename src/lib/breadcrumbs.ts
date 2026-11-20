import { localizedHref } from "./locale";

export interface Crumb {
  name: string;
  /** A path with its language prefix. */
  href: string;
  current: boolean;
  /**
   * False for a step of the trail that has no page to lead to (the services' list word when no
   * page of the site stands there, docs/decisions/0046 V4): it is shown as text. Left out otherwise.
   */
  link?: false;
}

export interface BreadcrumbSource {
  title: string;
  href: string;
  /** False when there is no page at `href`: the step is text, not a link. */
  link?: boolean;
}

/**
 * The trail of a page below the home page: the home page, the published ancestors, the page
 * itself (the page answer's `breadcrumbs` already ends with it). Empty for the home page, which
 * has no breadcrumbs (CLAUDE.md).
 */
export function buildCrumbs(options: {
  homeLabel: string;
  locale: string;
  defaultLocale: string;
  isHome: boolean;
  trail: readonly BreadcrumbSource[];
}): Crumb[] {
  const { homeLabel, locale, defaultLocale, isHome, trail } = options;
  if (isHome || trail.length === 0) return [];
  return [
    { name: homeLabel, href: localizedHref(locale, "/", defaultLocale), current: false },
    ...trail.map((item, index) => ({
      name: item.title,
      href: item.href,
      current: index === trail.length - 1,
      ...(item.link === false && index !== trail.length - 1 ? { link: false as const } : {}),
    })),
  ];
}
