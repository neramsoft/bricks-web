import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/page-view";
import { getMenusData, getPreviewPage, getSiteData } from "@/lib/data";
import { env } from "@/lib/env";
import { normalizePath } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";
import { pageMetadata } from "@/lib/page-metadata";

// The preview of a draft: the CMS opens `/preview?token=&path=&locale=`. Always rendered per
// request, never cached, never indexed (next.config.ts adds the headers). The token opens that
// one page.
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function load(search: Search) {
  const query = await search;
  const token = first(query.token) ?? first(query.preview);
  const defaultSite = await getSiteData();
  const locale = first(query.locale) ?? defaultSite.defaultLocale;
  const path = normalizePath(first(query.path) ?? "/");
  const page = token ? await getPreviewPage(token, locale, path) : null;
  return { page, locale, defaultSite };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const { page, locale, defaultSite } = await load(searchParams);
  const noindex: Metadata = { robots: { index: false, follow: false } };
  if (!page) {
    return { ...noindex, title: messagesFor(defaultSite.defaultLocale).previewInvalid.title };
  }
  const site = await getSiteData(locale);
  return {
    ...pageMetadata({ page, site, siteUrl: env().SITE_URL, locale, preview: true }),
    ...noindex,
  };
}

export default async function PreviewPage({ searchParams }: { searchParams: Search }) {
  const { page, locale } = await load(searchParams);
  if (!page) notFound();
  const [site, menus] = await Promise.all([getSiteData(locale), getMenusData(locale)]);
  return (
    <PageView
      page={page}
      site={site}
      menus={menus}
      locale={locale}
      siteUrl={env().SITE_URL}
      preview
    />
  );
}
