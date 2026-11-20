import type { ApiComponents } from "@probiz/sdk";

type Hours = ApiComponents["schemas"]["PublicOpeningHours"];
type Interval = ApiComponents["schemas"]["TimeInterval"];
type Spec = Record<string, unknown>;

const SCHEMA_DAY = {
  MONDAY: "https://schema.org/Monday",
  TUESDAY: "https://schema.org/Tuesday",
  WEDNESDAY: "https://schema.org/Wednesday",
  THURSDAY: "https://schema.org/Thursday",
  FRIDAY: "https://schema.org/Friday",
  SATURDAY: "https://schema.org/Saturday",
  SUNDAY: "https://schema.org/Sunday",
} as const;

/** schema.org has no `24:00`: the last minute of the day. */
const schemaTime = (time: string): string => (time === "24:00" ? "23:59" : time);

/**
 * `openingHoursSpecification` from the hours the page shows: days with the same intervals share
 * one entry; a day with two intervals has two entries; an exception is an entry for that date
 * only, and a closed day is `00:00` to `00:00` as schema.org has it. Closed weekdays have no
 * entry. Empty when there is nothing open.
 */
export function openingHoursSpecification(hours: Hours): Spec[] {
  const groups = new Map<string, { days: string[]; interval: Interval }>();
  for (const day of hours.weekly) {
    if (!day.open) continue;
    for (const interval of day.intervals) {
      const key = `${interval.opens}-${interval.closes}`;
      const group = groups.get(key) ?? { days: [], interval };
      group.days.push(SCHEMA_DAY[day.day]);
      groups.set(key, group);
    }
  }
  const weekly: Spec[] = [...groups.values()].map(({ days, interval }) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: days.length === 1 ? days[0] : days,
    opens: schemaTime(interval.opens),
    closes: schemaTime(interval.closes),
  }));
  const exceptions: Spec[] = (hours.exceptions ?? []).flatMap((exception) => {
    const dates = { validFrom: exception.date, validThrough: exception.date };
    if (exception.closed || exception.intervals.length === 0) {
      return [{ "@type": "OpeningHoursSpecification", opens: "00:00", closes: "00:00", ...dates }];
    }
    return exception.intervals.map((interval) => ({
      "@type": "OpeningHoursSpecification",
      opens: schemaTime(interval.opens),
      closes: schemaTime(interval.closes),
      ...dates,
    }));
  });
  return [...weekly, ...exceptions];
}
