import type { ApiComponents } from "@probiz/sdk";
import { fill } from "@/lib/format";
import type { Messages } from "@/lib/messages";

type Hours = ApiComponents["schemas"]["PublicOpeningHours"];
type Day = ApiComponents["schemas"]["WeekdayHours"]["day"];

const ORDER: Day[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function shortDay(day: Day, locale: string): string {
  // 2024-01-01 was a Monday.
  const date = new Date(Date.UTC(2024, 0, 1 + ORDER.indexOf(day)));
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
    .format(date)
    .replace(/\.$/, "");
}

/** Consecutive days as a range ("pon–pet"), a pair as "pon, uto". */
function daysLabel(days: readonly Day[], locale: string, messages: Messages): string {
  const index = days.map((day) => ORDER.indexOf(day));
  if (index.length === 7) return messages.menu.everyDay;
  if (index.length === 5 && index.every((value, i) => value === i)) return messages.menu.weekdays;
  if (index.length === 2 && index[0] === 5 && index[1] === 6) return messages.menu.weekends;
  const runs: Day[][] = [];
  for (const day of days) {
    const last = runs[runs.length - 1];
    if (last && ORDER.indexOf(last[last.length - 1]!) + 1 === ORDER.indexOf(day)) last.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) =>
      run.length >= 3
        ? `${shortDay(run[0]!, locale)}–${shortDay(run[run.length - 1]!, locale)}`
        : run.map((day) => shortDay(day, locale)).join(", "),
    )
    .join(", ");
}

/**
 * When a menu is served, in words ("Dostupno svaki dan 07:00–17:00"): display only, the menu
 * stays visible at other times. Days with the same hours are one part. Null when no day is open.
 */
export function availabilityText(
  hours: Hours | null | undefined,
  locale: string,
  messages: Messages,
): string | null {
  if (!hours) return null;
  const groups = new Map<string, { days: Day[]; times: string }>();
  for (const day of ORDER) {
    const entry = hours.weekly.find((item) => item.day === day);
    if (!entry || !entry.open || entry.intervals.length === 0) continue;
    const times = entry.intervals
      .map((interval) =>
        fill(messages.blocks.opensCloses, { from: interval.opens, to: interval.closes }),
      )
      .join(", ");
    const group = groups.get(times) ?? { days: [], times };
    group.days.push(day);
    groups.set(times, group);
  }
  if (groups.size === 0) return null;
  const when = [...groups.values()]
    .map((group) => `${daysLabel(group.days, locale, messages)} ${group.times}`)
    .join("; ");
  return fill(messages.menu.available, { when });
}
