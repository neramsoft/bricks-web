import type { ReactNode } from "react";
import { RootShell } from "@/components/root-shell";
import { brandCss } from "@/lib/brand";
import { getRouteContext, getSiteData, routeKey } from "@/lib/data";

/** The document of a catch-all route: `lang` and the brand colours follow the language of the address. */
export async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ route?: string[] }>;
}) {
  const { route } = await params;
  const context = await getRouteContext(routeKey(route));
  const locale = context.route?.locale ?? context.defaultLocale;
  const site = await getSiteData(locale);
  return (
    <RootShell locale={locale} brandCss={brandCss(site.brand)}>
      {children}
    </RootShell>
  );
}
