import type { ApiComponents } from "@probiz/sdk";
import { dayMonth, fill, weekdayName, weekdayOf } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import type { HeadingTag } from "../heading-level";

type Hours = ApiComponents["schemas"]["PublicOpeningHours"];
type Interval = ApiComponents["schemas"]["TimeInterval"];

const range = (interval: Interval, messages: Messages) =>
  fill(messages.blocks.opensCloses, { from: interval.opens, to: interval.closes });

export const intervalsText = (intervals: readonly Interval[], messages: Messages): string =>
  intervals.map((interval) => range(interval, messages)).join(", ");

function formatDay(value: string, locale: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dayMonth(date, "UTC", locale, true);
}

/** The week's opening hours, today in amber, then the exceptions. Shared by the hours block and the contact details. */
export function HoursList({
  hours,
  locale,
  messages,
  timeZone,
  showExceptions = true,
  subHeading = "h3",
}: {
  hours: Hours;
  locale: string;
  messages: Messages;
  timeZone: string;
  showExceptions?: boolean;
  /** The element of the exceptions' title: one level below the block's heading (itemHeading). */
  subHeading?: HeadingTag;
}) {
  const SubHeading = subHeading;
  const today = weekdayOf(new Date(), timeZone);
  const exceptions = showExceptions ? (hours.exceptions ?? []) : [];
  return (
    <>
      <dl className="hours-wk">
        {hours.weekly.map((day) => {
          const cls = day.day === today ? "today" : undefined;
          return (
            <div key={day.day} style={{ display: "contents" }}>
              <dt className={cls}>{weekdayName(day.day, locale)}</dt>
              <dd className={cls}>
                {day.open && day.intervals.length > 0
                  ? intervalsText(day.intervals, messages)
                  : messages.blocks.closed}
              </dd>
            </div>
          );
        })}
      </dl>
      {exceptions.length > 0 ? (
        <>
          <SubHeading className="hours-sub">{messages.blocks.hoursExceptions}</SubHeading>
          <dl className="hours-wk">
            {exceptions.map((exception) => (
              <div key={exception.date} style={{ display: "contents" }}>
                <dt>
                  {formatDay(exception.date, locale)}
                  {exception.label ? <span className="exc">{exception.label}</span> : null}
                </dt>
                <dd>
                  {exception.closed || exception.intervals.length === 0
                    ? messages.blocks.closed
                    : intervalsText(exception.intervals, messages)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </>
  );
}
