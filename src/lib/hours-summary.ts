import type { ApiComponents } from "@probiz/sdk";
import { fill, weekdayOf } from "./format";
import type { Messages } from "./messages";

type Hours = ApiComponents["schemas"]["PublicOpeningHours"];

/** "Danas 07:00–23:00" or "Danas zatvoreno" from the weekly hours; null without hours for that weekday. */
export function todayHoursText(
  hours: Hours,
  now: Date,
  timeZone: string,
  messages: Messages,
): string | null {
  const today = weekdayOf(now, timeZone);
  const day = hours.weekly.find((entry) => entry.day === today);
  if (!day) return null;
  if (!day.open || day.intervals.length === 0) return messages.blocks.todayClosed;
  const times = day.intervals
    .map((interval) =>
      fill(messages.blocks.opensCloses, { from: interval.opens, to: interval.closes }),
    )
    .join(", ");
  return fill(messages.openToday, { hours: times });
}
