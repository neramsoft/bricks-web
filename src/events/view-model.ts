import type { ApiComponents } from "@probiz/sdk";
import { clock, dayInZone, fill, formatMoney, weekdayIn } from "@/lib/format";
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

/**
 * The hours of an event: "21:00–23:00", or "21:00" with no end. An end on a later day of the
 * venue's clock (a night that runs past midnight) names that day: "21:00–sub 01:00", so the range
 * is never read as ending before it starts. An all-day event has no hours.
 */
export function timeRange(
  event: Pick<EventSummary, "startsAt" | "endsAt" | "allDay">,
  timeZone: string,
  locale: string,
  messages: Messages["events"],
): string {
  if (event.allDay) return messages.allDay;
  const start = clock(event.startsAt, timeZone, locale);
  if (!event.endsAt) return start;
  const end = clock(event.endsAt, timeZone, locale);
  if (dayInZone(event.endsAt, timeZone) === dayInZone(event.startsAt, timeZone)) {
    return `${start}\u2013${end}`;
  }
  return `${start}\u2013${weekdayIn(event.endsAt, timeZone, locale, "short")} ${end}`;
}

/** "petak, 21. novembar": the weekday, the day and the month, as the wide card's "Kad" begins. */
export function dayText(startsAt: string, timeZone: string, locale: string): string {
  const day = part(startsAt, timeZone, locale, { day: "numeric", month: "long" });
  return `${weekdayIn(startsAt, timeZone, locale)}, ${day}`;
}

/** "petak, 21:00\u201323:00": the weekday and the hours, a row's first words. */
export function rowWhenText(
  event: Pick<EventSummary, "startsAt" | "endsAt" | "allDay">,
  timeZone: string,
  locale: string,
  messages: Messages["events"],
): string {
  return `${weekdayIn(event.startsAt, timeZone, locale)}, ${timeRange(event, timeZone, locale, messages)}`;
}

/** The wide card's "Kad": "petak, 21. novembar · 21:00–23:00". */
export function fullWhenText(
  event: Pick<EventSummary, "startsAt" | "endsAt" | "allDay">,
  timeZone: string,
  locale: string,
  messages: Messages["events"],
): string {
  return `${dayText(event.startsAt, timeZone, locale)} \u00b7 ${timeRange(event, timeZone, locale, messages)}`;
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

/** The price as the "Ulaz" line and the rows say it: free is "Bez ulaza", the rest as `priceText`. */
export function entryText(
  event: Pick<EventSummary, "priceType" | "price" | "currency">,
  locale: string,
  messages: Messages["events"],
): string | null {
  return event.priceType === "FREE" ? messages.freeEntry : priceText(event, locale, messages);
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

/**
 * The next event is the featured one, whatever the CMS's `featured` flag says: the first event
 * that is not over, in the order the CMS lists them (soonest first). The rest follow as rows. With
 * every event over there is no wide card and all of them are rows.
 */
export function splitEvents<T extends Pick<EventSummary, "ended">>(
  events: readonly T[],
): { first: T | null; rest: T[] } {
  const index = events.findIndex((event) => !event.ended);
  if (index === -1) return { first: null, rest: [...events] };
  return { first: events[index]!, rest: events.filter((_, i) => i !== index) };
}

/** The calendar file of an event, on the CMS's public address (a normal link, no data address). */
export function icsUrl(publicApiUrl: string, id: string): string {
  return `${publicApiUrl.replace(/\/+$/, "")}/v1/public/events/${encodeURIComponent(id)}/ics`;
}

/** The slug of an event's own page (the last part of its `href`); null for an event without one. */
export function slugOfHref(href: string | null): string | null {
  if (!href) return null;
  const last = href.split(/[?#]/)[0]!.split("/").filter(Boolean).pop();
  return last ? decodeURIComponent(last) : null;
}
