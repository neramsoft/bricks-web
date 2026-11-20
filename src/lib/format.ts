// Words and numbers for the page, in a language and a time zone. Pure, so the components, the
// JSON-LD and the tests share them.

/** `fill("{n} min", { n: 3 })`: the placeholders of a message. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * An amount in whole cents as money in a language: `2,50 KM` in Bosnian, `KM 2.50` in English.
 * The narrow symbol is used so the currency reads as the café writes it.
 */
export function formatMoney(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

const DAY_INDEX = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

export type WeekdayKey = keyof typeof DAY_INDEX;
export const WEEKDAYS = Object.keys(DAY_INDEX) as WeekdayKey[];

/** The name of a weekday in a language ("ponedjeljak"), without depending on today's date. */
export function weekdayName(day: WeekdayKey, locale: string, width: "long" | "short" = "long") {
  // 2024-01-01 was a Monday.
  const date = new Date(Date.UTC(2024, 0, DAY_INDEX[day]));
  return new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(date);
}

/** The weekday of an instant in a time zone, as the CMS names it. */
export function weekdayOf(instant: Date, timeZone: string): WeekdayKey {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone })
    .format(instant)
    .toUpperCase();
  return (name in DAY_INDEX ? name : "MONDAY") as WeekdayKey;
}

function zoned(instant: Date | string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return (locale: string): string => {
    try {
      return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
    } catch {
      return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
    }
  };
}

/** A calendar day (`YYYY-MM-DD`) of an instant in a time zone. */
export function dayInZone(instant: Date | string, timeZone: string): string {
  return zoned(instant, timeZone, { year: "numeric", month: "2-digit", day: "2-digit" })("en-CA");
}

/** "18:00": 24-hour in every language of the site. */
export function clock(instant: Date | string, timeZone: string, locale: string): string {
  return zoned(instant, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })(locale);
}

/** "petak" / "Friday". */
export function weekdayIn(instant: Date | string, timeZone: string, locale: string): string {
  return zoned(instant, timeZone, { weekday: "long" })(locale);
}

/**
 * An instant as ISO 8601 with the offset of a time zone ("2026-11-20T18:00:00+01:00"), the form
 * `Event.startDate` takes. A zone the runtime does not know gives UTC.
 */
export function isoInZone(instant: string, timeZone: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return instant;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "longOffset",
    });
    const map = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
    const raw = map.timeZoneName ?? "GMT";
    const offset = raw === "GMT" ? "+00:00" : raw.replace("GMT", "").replace("−", "-");
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}${offset}`;
  } catch {
    return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  }
}

/** The digits and `+` of a phone number, for `tel:`. */
export const dialable = (number: string): string => number.replace(/[^+\d]/g, "");

/** The time zone the site's times are shown in when the business settings name none. */
export const DEFAULT_TIME_ZONE = "Europe/Sarajevo";

/** A time zone name the runtime knows, else the default one. */
export function validTimeZone(value: string | null | undefined): string {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}
