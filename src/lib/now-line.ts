import { clock, dayInZone, fill, validTimeZone, weekdayIn } from "./format";
import type { Messages } from "./messages";

// The line under the hero's headline: whether the venue is open, until when, and what is on next.
// It is worked out from what the API gives for the main venue (`openNow` and `todayHours`, which
// the CMS computes in the venue's time zone) and the next upcoming event. The page is cached, so
// the same function runs again in the browser (components/now-line.tsx) to keep the line true
// between renders. Pure: the clock and the time zone are arguments.

export interface TodayHours {
  /** The day these intervals are for, `YYYY-MM-DD` in the venue's time zone. */
  date: string;
  closed: boolean;
  intervals: ReadonlyArray<{ opens: string; closes: string }>;
}

export interface NextEvent {
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
}

export interface NowInput {
  /** What the API said at render time; null without hours. */
  openNow: boolean | null;
  today: TodayHours | null;
  event: NextEvent | null;
  timeZone: string;
  locale: string;
  now: Date;
}

export type NowState =
  | { kind: "open"; until: string | null }
  | { kind: "openingSoon"; at: string }
  | { kind: "closedOpensAt"; at: string }
  | { kind: "closed" }
  | { kind: "closedToday" }
  | { kind: "unknown" };

export interface NowLine {
  state: NowState;
  /** The big part: "Otvoreno do 23:00". Null when nothing can be said. */
  headline: string | null;
  /** The second part: "Večeras: Akustika petkom, 21:00". Null without a coming event. */
  event: string | null;
  /** "evening" colours the headline amber, the way the prototype's pivo mode does. */
  mode: "day" | "evening";
}

/** Opening soon means within this many minutes. */
export const OPENING_SOON_MINUTES = 60;
/** From this hour of the venue's day the headline is the evening one. */
export const EVENING_FROM_HOUR = 17;

/** Minutes after midnight of a `HH:MM` time (`24:00` is the end of the day). */
export function minutesOf(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** The venue's minutes after midnight and its calendar day. */
function localTime(now: Date, timeZone: string) {
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return { minutes: minutesOf(text), day: dayInZone(now, timeZone) };
}

/**
 * Whether the intervals of a day are running now. An interval whose closing time is not after its
 * opening time runs past midnight: today it is open from its opening time on (the part after
 * midnight belongs to the next day's clock and is told by `openNow`).
 */
function insideInterval(
  intervals: TodayHours["intervals"],
  minutes: number,
): { opens: string; closes: string; overnight: boolean } | null {
  for (const interval of intervals) {
    const from = minutesOf(interval.opens);
    const to = minutesOf(interval.closes);
    const overnight = to <= from;
    if (overnight ? minutes >= from : minutes >= from && minutes < to)
      return { ...interval, overnight };
  }
  return null;
}

/** The state of the venue now. */
export function nowState(
  input: Pick<NowInput, "openNow" | "today" | "timeZone" | "now">,
): NowState {
  const { today, openNow } = input;
  const timeZone = validTimeZone(input.timeZone);
  if (!today) {
    return openNow === null
      ? { kind: "unknown" }
      : openNow
        ? { kind: "open", until: null }
        : { kind: "closed" };
  }
  const local = localTime(input.now, timeZone);
  // The hours are of another day than the clock's: the page has aged past midnight. Say what the
  // API said, without times that belong to yesterday.
  if (today.date !== local.day) {
    if (openNow === null) return { kind: "unknown" };
    return openNow ? { kind: "open", until: null } : { kind: "closed" };
  }
  const running = today.closed ? null : insideInterval(today.intervals, local.minutes);
  if (running) {
    // Past midnight the closing time is tomorrow's: say it plainly ("do 02:00").
    return { kind: "open", until: running.closes };
  }
  // Before the first opening time of the day the venue may still be in yesterday's late hours.
  const first = today.closed
    ? null
    : [...today.intervals].sort((a, b) => minutesOf(a.opens) - minutesOf(b.opens))[0];
  const beforeFirst = !first || local.minutes < minutesOf(first.opens);
  if (openNow === true && beforeFirst) return { kind: "open", until: null };
  if (today.closed || today.intervals.length === 0) return { kind: "closedToday" };
  const next = [...today.intervals]
    .map((interval) => ({ interval, from: minutesOf(interval.opens) }))
    .filter((item) => item.from > local.minutes)
    .sort((a, b) => a.from - b.from)[0];
  if (!next) return { kind: "closed" };
  const wait = next.from - local.minutes;
  return wait <= OPENING_SOON_MINUTES
    ? { kind: "openingSoon", at: next.interval.opens }
    : { kind: "closedOpensAt", at: next.interval.opens };
}

function stateText(state: NowState, messages: Messages["now"]): string | null {
  switch (state.kind) {
    case "open":
      return state.until ? fill(messages.openUntil, { time: state.until }) : messages.open;
    case "openingSoon":
      return fill(messages.openingSoon, { time: state.at });
    case "closedOpensAt":
      return fill(messages.closedOpensAt, { time: state.at });
    case "closed":
      return messages.closed;
    case "closedToday":
      return messages.closedToday;
    case "unknown":
      return null;
  }
}

/** The event part: "tonight" from the evening, "today" earlier, else the weekday. Null for an event that is over. */
export function eventText(input: NowInput, messages: Messages["now"]): string | null {
  const { event, now, locale } = input;
  if (!event) return null;
  const timeZone = validTimeZone(input.timeZone);
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  if ((end ?? start).getTime() < now.getTime() && !event.allDay) return null;
  const title = event.title;
  const day = dayInZone(start, timeZone);
  const today = dayInZone(now, timeZone);
  const time = event.allDay ? "" : clock(start, timeZone, locale);
  if (event.allDay) {
    return day === today
      ? fill(messages.todayAllDay, { title })
      : fill(messages.nextDay, { title, day: weekdayIn(start, timeZone, locale) });
  }
  if (day === today) {
    const evening = localTime(start, timeZone).minutes >= EVENING_FROM_HOUR * 60;
    return fill(evening ? messages.tonight : messages.today, { title, time });
  }
  return fill(messages.next, { title, day: weekdayIn(start, timeZone, locale), time });
}

/** Everything the hero's line says. */
export function nowLine(input: NowInput, messages: Messages["now"]): NowLine {
  const timeZone = validTimeZone(input.timeZone);
  const state = nowState({ ...input, timeZone });
  const local = localTime(input.now, timeZone);
  const open = state.kind === "open";
  return {
    state,
    headline: stateText(state, messages),
    event: eventText({ ...input, timeZone }, messages),
    mode: open && local.minutes >= EVENING_FROM_HOUR * 60 ? "evening" : "day",
  };
}
