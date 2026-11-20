import type { PublicMenus, PublicPage, PublicSite } from "@probiz/sdk";
import { Blocks } from "@/blocks/blocks";
import { parseBlocks } from "@/blocks/parse";
import { buildCrumbs } from "@/lib/breadcrumbs";
import { breadcrumbLd, graph, organizationLd, websiteLd } from "@/lib/jsonld";
import { messagesFor } from "@/lib/messages";
import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "./json-ld";
import { SiteChrome } from "./site-chrome";

/**
 * A CMS page inside the site chrome: the breadcrumbs, the `h1` and the blocks. A page that opens
 * with a hero lets the hero's headline be the `h1`; any other page shows its title.
 */
export function PageView({
  page,
  site,
  menus,
  locale,
  siteUrl,
  preview = false,
}: {
  page: PublicPage;
  site: PublicSite;
  menus: PublicMenus;
  locale: string;
  siteUrl: string;
  preview?: boolean;
}) {
  const messages = messagesFor(locale);
  const crumbs = buildCrumbs({
    homeLabel: messages.home,
    locale,
    defaultLocale: site.defaultLocale,
    isHome: page.isHome,
    trail: page.breadcrumbs,
  });
  const blocks = parseBlocks(page.blocks);
  // The home page names the business; every page below it has its trail. A draft says nothing.
  const ld = preview
    ? null
    : graph(
        page.isHome
          ? [organizationLd(site, siteUrl), websiteLd(site, siteUrl, locale)]
          : [breadcrumbLd(crumbs, siteUrl)],
      );
  return (
    <SiteChrome
      site={site}
      menus={menus}
      messages={messages}
      locale={locale}
      alternates={page.alternates}
    >
      {preview ? <p role="status">{messages.previewBanner}</p> : null}
      <JsonLd data={ld} />
      <Breadcrumbs crumbs={crumbs} label={messages.breadcrumbs} />
      {blocks[0]?.type === "hero" ? null : <h1>{page.title}</h1>}
      <Blocks blocks={blocks} />
    </SiteChrome>
  );
}
