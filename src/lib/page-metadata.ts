import type { Metadata } from "next";
import type { PublicPage, PublicSite } from "@probiz/sdk";
import { absoluteUrl } from "./locale";
import { canonicalUrl, documentTitle, hreflangLanguages, robotsFor } from "./seo";

/** Open Graph wants `language_TERRITORY`; the CMS's codes are bare languages. */
const OG_LOCALES: Record<string, string> = { bs: "bs_BA", en: "en_US" };

/** Title, description, canonical, hreflang, Open Graph and robots of a CMS page, from its SEO fields. */
export function pageMetadata(options: {
  page: PublicPage;
  site: PublicSite;
  siteUrl: string;
  locale: string;
  preview?: boolean;
}): Metadata {
  const { page, site, siteUrl, locale, preview = false } = options;
  const siteName = site.business.name ?? site.business.legalName;
  const title = documentTitle({ title: page.seo.title, siteName, isHome: page.isHome });
  const canonical = canonicalUrl({ siteUrl, href: page.href, override: page.seo.canonicalUrl });
  const languages = hreflangLanguages(page.alternates, {
    siteUrl,
    defaultLocale: site.defaultLocale,
    enabled: site.localization.hreflang,
  });
  const image = page.seo.ogImage;
  const description = page.seo.description ?? undefined;
  const base: Metadata = {
    title: { absolute: title },
    description,
    // The page's own switch, the site-wide indexing switch and a preview all close the page.
    robots: robotsFor(preview || page.seo.noindex || !site.indexing),
    openGraph: {
      type: "website",
      url: canonical,
      title: page.seo.title,
      description,
      siteName: siteName ?? undefined,
      locale: OG_LOCALES[locale] ?? locale,
      ...(image
        ? {
            images: [
              {
                url: absoluteUrl(siteUrl, image.url),
                width: image.width,
                height: image.height,
                alt: image.alt ?? page.seo.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: page.seo.title,
      description,
    },
  };
  // A preview is a draft: no canonical, no alternates, nothing to index.
  if (preview) return base;
  return { ...base, alternates: { canonical, ...(languages ? { languages } : {}) } };
}
