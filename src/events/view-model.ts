import type { ApiComponents } from "@probiz/sdk";
import { clock, fill, formatMoney, weekdayIn } from "@/lib/format";
import type { Messages } from "@/lib/messages";

export type EventSummary = ApiComponents["schemas"]["PublicEventSummary"];
export type EventPlace = ApiComponents["schemas"]["PublicEventPlace"];

function part(
  instant: string,
  timeZone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(new Date(instant));
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
      new Date(instant),
    );
  }
}

/**
 * The date tile of an event: the day of the month and the short month, in the venue's time zone
 * (an event at 00:30 belongs to the day the venue's clock says, not UTC's).
 */
export function dateTile(
  startsAt: string,
  timeZone: string,
  locale: string,
): { day: string; month: string } {
  return {
    day: part(startsAt, timeZone, locale, { day: "numeric" }).replace(/\.$/, ""),
    month: part(startsAt, timeZone, locale, { month: "short" }).replace(/\.$/, "").toLowerCase(),
  };
}

/** "petak, 21:00" (an all-day event: "petak, cijeli dan"). */
export function whenText(
  event: Pick<EventSummary, "startsAt" | "allDay">,
  timeZone: string,
  locale: string,
  messages: Messages["events"],
): string {
  const day = weekdayIn(event.startsAt, timeZone, locale);
  return `${day}, ${event.allDay ? messages.allDay : clock(event.startsAt, timeZone, locale)}`;
}

/** The price as the page says it; null for a price that needs an amount and has none (nothing is better than a wrong price). */
export function priceText(
  event: Pick<EventSummary, "priceType" | "price" | "currency">,
  locale: string,
  messages: Messages["events"],
): string | null {
  switch (event.priceType) {
    case "FREE":
      return messages.free;
    case "ON_REQUEST":
      return messages.priceOnRequest;
    case "FIXED":
      return event.price === null ? null : formatMoney(event.price, event.currency, locale);
    case "FROM":
      return event.price === null
        ? null
        : fill(messages.priceFrom, { amount: formatMoney(event.price, event.currency, locale) });
  }
}

/** The place on one line: its name, then the address when it has one. */
export function placeText(place: EventPlace | null): string | null {
  if (!place) return null;
  const address = place.address
    ? [
        place.address.street,
        [place.address.postalCode, place.address.city].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
    : place.addressText;
  return [place.name, address].filter((entry): entry is string => Boolean(entry)).join(", ");
}

/** The badges of an event: its own state, whether it is over, whether registration is open. */
export function badgesOf(event: EventSummary, messages: Messages["events"]): string[] {
  const list: string[] = [];
  if (event.eventStatus !== "SCHEDULED") list.push(messages.statuses[event.eventStatus]);
  if (event.ended) list.push(messages.statuses.ENDED);
  else if (event.registrationOpen && event.eventStatus === "SCHEDULED") {
    list.push(messages.registrationOpen);
  }
  return list;
}

/** The index of the event the list draws wide: the first featured one that is on; -1 for none. */
export function featuredIndex(events: readonly EventSummary[]): number {
  return events.findIndex(
    (event) => event.featured && event.eventStatus === "SCHEDULED" && !event.ended,
  );
}
