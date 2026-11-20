import type { PublicMenus, PublicPage, PublicSite } from "@probiz/sdk";
import { featuredPerformers } from "@/events/performers";
import { splitEvents } from "@/events/view-model";
import { Blocks } from "@/blocks/blocks";
import { parseBlocks } from "@/blocks/parse";
import { buildCrumbs } from "@/lib/breadcrumbs";
import { businessExtras, recordNodes } from "@/lib/block-jsonld";
import { validTimeZone } from "@/lib/format";
import { breadcrumbLd, graph, organizationLd, websiteLd } from "@/lib/jsonld";
import { messagesFor } from "@/lib/messages";
import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "./json-ld";
import { SiteChrome } from "./site-chrome";

/**
 * A CMS page inside the site chrome: the breadcrumbs, the `h1` and the blocks. A page that opens
 * with a hero lets the hero's headline be the `h1`; any other page shows its title.
 */
export async function PageView({
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
  const timeZone = validTimeZone(site.business.timeZone);
  const crumbs = buildCrumbs({
    homeLabel: messages.home,
    locale,
    defaultLocale: site.defaultLocale,
    isHome: page.isHome,
    trail: page.breadcrumbs,
  });
  const blocks = parseBlocks(page.blocks);
  const performers: Record<string, string[]> = {};
  for (const block of blocks) {
    if (block.type !== "eventList") continue;
    const events = (block.data.events ?? []).filter((event) => event.title);
    const first = splitEvents(events).first;
    if (first) performers[first.id] = await featuredPerformers(events, locale);
  }
  const context = { site, siteUrl, locale, timeZone, messages, href: page.href, performers };
  // The home page names the business; every page below it has its trail. A page whose blocks show
  // the business's hours, position or menu names the business too, with exactly those. A draft
  // says nothing.
  const extras = businessExtras(blocks, context);
  const names = page.isHome || Object.keys(extras).length > 0;
  const ld = preview
    ? null
    : graph([
        ...(names ? [organizationLd(site, siteUrl, extras)] : []),
        ...(page.isHome ? [websiteLd(site, siteUrl, locale)] : [breadcrumbLd(crumbs, siteUrl)]),
        ...recordNodes(blocks, context),
      ]);
  return (
    <SiteChrome
      site={site}
      menus={menus}
      messages={messages}
      locale={locale}
      alternates={page.alternates}
    >
      {preview ? (
        <p role="status" className="preview-banner">
          {messages.previewBanner}
        </p>
      ) : null}
      <JsonLd data={ld} />
      <Breadcrumbs crumbs={crumbs} label={messages.breadcrumbs} />
      {blocks[0]?.type === "hero" ? null : (
        <h1 className="page-title wrap h-display">{page.title}</h1>
      )}
      <Blocks
        blocks={blocks}
        page={{
          messages,
          locale,
          site,
          timeZone,
          path: page.href,
          preview,
        }}
      />
    </SiteChrome>
  );
}
