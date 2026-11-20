import type { PublicSite } from "@probiz/sdk";
import type { ParsedBlock } from "@/blocks/types";
import { eventSummaryLd } from "@/events/jsonld";
import { splitEvents } from "@/events/view-model";
import { locationLd } from "@/locations/jsonld";
import { openingHoursSpecification } from "./hours-ld";
import { absoluteUrl } from "./locale";
import type { Messages } from "./messages";

// Structured data that follows the blocks of a page. The rule (CLAUDE.md) is that JSON-LD, Open
// Graph and the visible page match: so a property is written only when a block on this page shows
// it. The `Event` and `LocalBusiness` nodes are the records the page lists; the business's own node
// gets `openingHoursSpecification`, `geo` and `hasMenu` only from the blocks that draw them.

type Ld = Record<string, unknown>;

interface Context {
  site: PublicSite;
  siteUrl: string;
  locale: string;
  timeZone: string;
  messages: Messages;
  /** The page's own address with its prefix. */
  href: string;
  /** The performers the wide event card shows, by event id (the full event has them). */
  performers?: Readonly<Record<string, readonly string[]>>;
}

/** One `Event` per event of an `eventList` block, one `LocalBusiness` per venue of a `locationList` block. */
export function recordNodes(blocks: readonly ParsedBlock[], ctx: Context): Ld[] {
  const nodes: Ld[] = [];
  for (const block of blocks) {
    if (block.type === "eventList") {
      const events = (block.data.events ?? []).filter((event) => event.title);
      const wide = splitEvents(events).first;
      events.forEach((event) =>
        nodes.push(
          eventSummaryLd({
            event,
            site: ctx.site,
            siteUrl: ctx.siteUrl,
            timeZone: ctx.timeZone,
            locale: ctx.locale,
            showsImage: event === wide,
            performers: event === wide ? ctx.performers?.[event.id] : undefined,
            messages: ctx.messages.events,
          }),
        ),
      );
    } else if (block.type === "locationList") {
      for (const location of block.data.locations ?? []) {
        nodes.push(locationLd({ location, site: ctx.site, siteUrl: ctx.siteUrl }));
      }
    }
  }
  return nodes;
}

/**
 * What the business's node gains from the blocks of this page; empty when no block shows any of
 * it. The hours are the ones an `openingHours` block (or a contact block that lists them) draws,
 * the point is the one a `map` block links to, the menu is one a `restaurantMenu` block draws.
 */
export function businessExtras(blocks: readonly ParsedBlock[], ctx: Context): Ld {
  const extras: Ld = {};
  for (const block of blocks) {
    if (!extras.openingHoursSpecification) {
      const hours =
        block.type === "openingHours"
          ? block.data.hours
          : block.type === "contactInfo" && block.data.show.includes("hours")
            ? block.data.info?.hours
            : undefined;
      const spec = hours ? openingHoursSpecification(hours) : [];
      if (spec.length > 0) extras.openingHoursSpecification = spec;
    }
    if (block.type === "map" && !extras.geo) {
      extras.geo = {
        "@type": "GeoCoordinates",
        latitude: block.data.latitude,
        longitude: block.data.longitude,
      };
    }
    if (block.type === "restaurantMenu" && block.data.menu && block.data.menu.sections.length > 0) {
      const menu = block.data.menu;
      const url = menu.href
        ? absoluteUrl(ctx.siteUrl, menu.href)
        : `${absoluteUrl(ctx.siteUrl, ctx.href)}${block.anchorId ? `#${block.anchorId}` : ""}`;
      const known = (extras.hasMenu as string[] | undefined) ?? [];
      if (!known.includes(url)) extras.hasMenu = [...known, url];
    }
  }
  return extras;
}
