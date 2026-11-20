import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/page-view";
import { getMenusData, getPageData, getRouteContext, getSiteData, routeKey } from "@/lib/data";
import { env } from "@/lib/env";
import { pageMetadata } from "@/lib/page-metadata";

type Props = { params: Promise<{ route?: string[] }> };

// Pages are rendered on the first request and kept (ISR); the CMS webhook expires them
// (app/api/revalidate), and the fetch lifetime in lib/api.ts bounds a missed one. Nothing here
// needs the API at build time.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const NOT_INDEXED: Metadata = { robots: { index: false, follow: true } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route } = await params;
  const context = await getRouteContext(routeKey(route));
  if (!context.route) return NOT_INDEXED;
  const { locale, path } = context.route;
  const [page, site] = await Promise.all([getPageData(locale, path), getSiteData(locale)]);
  if (!page) return NOT_INDEXED;
  return pageMetadata({ page, site, siteUrl: env().SITE_URL, locale });
}

export default async function Page({ params }: Props) {
  const { route } = await params;
  const context = await getRouteContext(routeKey(route));
  if (!context.route) notFound();
  const { locale, path } = context.route;
  const page = await getPageData(locale, path);
  if (!page) notFound();
  const [site, menus] = await Promise.all([getSiteData(locale), getMenusData(locale)]);
  return (
    <PageView page={page} site={site} menus={menus} locale={locale} siteUrl={env().SITE_URL} />
  );
}
