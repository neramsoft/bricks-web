import type { PublicSite } from "@probiz/sdk";
import type { Messages } from "@/lib/messages";
import type { ParsedBlock, RenderData } from "../types";

/** What every block component is given besides its block. */
export interface BlockContext {
  messages: Messages;
  locale: string;
  site: PublicSite;
  /** The site's time zone (the business setting): times of events are shown in it. */
  timeZone: string;
  /** The first block of the page: a hero there owns the page's `h1` and its image loads first. */
  lead: boolean;
  /** The page's own address (with its language prefix): where a form sends the visitor back to. */
  path: string;
  /** A draft preview: forms are drawn but send nothing. */
  preview: boolean;
  /**
   * The anchor of the page's reservation form (a `contactForm` block), or null when the page has
   * none: a "Rezerviši sto" button links to it only when there is somewhere to go.
   */
  reservationAnchor: string | null;
  /** Which restaurantMenu block of the page this is (0 is the first): the chapters alternate their ground. */
  menuIndex: number;
}

export interface BlockProps<T extends keyof RenderData> {
  block: Extract<ParsedBlock, { type: T }>;
  ctx: BlockContext;
}
