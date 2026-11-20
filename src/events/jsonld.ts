import type { PublicSite } from "@probiz/sdk";
import { isoInZone } from "@/lib/format";
import { absoluteUrl } from "@/lib/locale";
import { priceText, type EventSummary } from "./view-model";

// `Event` structured data for the events a page lists. Everything in it is on the card: the name,
// the summary, the dates, the status, the place, the price and the picture of the wide card.

type Ld = Record<string, unknown>;
const SCHEMA = "https://schema.org/";

const STATUS: Record<EventSummary["eventStatus"], string> = {
  SCHEDULED: "EventScheduled",
  CANCELLED: "EventCancelled",
  POSTPONED: "EventPostponed",
  RESCHEDULED: "EventRescheduled",
};

/** Whole cents as the decimal amount schema.org wants. */
const amount = (cents: number): number => Math.round(cents) / 100;

function placeLd(place: NonNullable<EventSummary["place"]>, siteUrl: string): Ld {
  const { address } = place;
  return {
    "@type": "Place",
    name: place.name,
    ...(place.href ? { url: absoluteUrl(siteUrl, place.href) } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(address.street ? { streetAddress: address.street } : {}),
            addressLocality: address.city,
            ...(address.postalCode ? { postalCode: address.postalCode } : {}),
            addressCountry: address.country,
          },
        }
      : place.addressText
        ? { address: place.addressText }
        : {}),
  };
}

export function eventSummaryLd(options: {
  event: EventSummary;
  site: PublicSite;
  siteUrl: string;
  timeZone: string;
  locale: string;
  /** Whether the card shows the picture (the wide card does). */
  showsImage: boolean;
  messages: Parameters<typeof priceText>[2];
}): Ld {
  const { event, siteUrl, timeZone, site } = options;
  const startDate = event.allDay
    ? event.startsAt.slice(0, 10)
    : isoInZone(event.startsAt, timeZone);
  const endDate = event.endsAt
    ? event.allDay
      ? event.endsAt.slice(0, 10)
      : isoInZone(event.endsAt, timeZone)
    : null;
  const shownPrice = priceText(event, options.locale, options.messages) !== null;
  const offer =
    !shownPrice || event.priceType === "ON_REQUEST"
      ? null
      : {
          "@type": "Offer",
          ...(event.href ? { url: absoluteUrl(siteUrl, event.href) } : {}),
          priceCurrency: event.currency,
          ...(event.priceType === "FREE"
            ? { price: 0 }
            : event.priceType === "FIXED"
              ? { price: amount(event.price!) }
              : {
                  priceSpecification: {
                    "@type": "PriceSpecification",
                    minPrice: amount(event.price!),
                    priceCurrency: event.currency,
                  },
                }),
        };
  const name = site.business.name ?? site.business.legalName;
  return {
    "@type": "Event",
    name: event.title,
    ...(event.href ? { url: absoluteUrl(siteUrl, event.href) } : {}),
    ...(event.summary ? { description: event.summary } : {}),
    startDate,
    ...(endDate ? { endDate } : {}),
    eventStatus: `${SCHEMA}${STATUS[event.eventStatus]}`,
    ...(event.place ? { location: placeLd(event.place, siteUrl) } : {}),
    ...(options.showsImage && event.image
      ? { image: [absoluteUrl(siteUrl, event.image.url)] }
      : {}),
    ...(offer ? { offers: offer } : {}),
    ...(name ? { organizer: { "@id": `${absoluteUrl(siteUrl, "/")}#organization` } } : {}),
  };
}
