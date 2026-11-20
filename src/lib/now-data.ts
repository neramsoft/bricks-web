import "server-only";
import { unwrap } from "@probiz/sdk";
import { cms } from "./api";
import type { NextEvent, TodayHours } from "./now-line";

// What the hero's "now" line is made from: the main venue (its `openNow` and `todayHours`, which
// the CMS computes in the venue's time zone) and the next event that has not ended. Both modules
// are optional: a module that is off, or an API that does not answer, leaves its part out and the
// page is drawn without it. Never throws.

export interface NowData {
  openNow: boolean | null;
  today: TodayHours | null;
  event: NextEvent | null;
}

export async function readNowData(locale: string): Promise<NowData> {
  const [location, event] = await Promise.all([readMainLocation(locale), readNextEvent(locale)]);
  return {
    openNow: location?.openNow ?? null,
    today: location?.todayHours
      ? {
          date: location.todayHours.date,
          closed: location.todayHours.closed,
          intervals: location.todayHours.intervals,
        }
      : null,
    event,
  };
}

async function readMainLocation(locale: string) {
  try {
    const { items } = unwrap(
      await cms().rest.GET("/v1/public/locations", { params: { query: { locale, limit: 50 } } }),
    );
    return items.find((item) => item.primary) ?? items[0] ?? null;
  } catch {
    return null;
  }
}

async function readNextEvent(locale: string): Promise<NextEvent | null> {
  try {
    const { items } = unwrap(
      await cms().rest.GET("/v1/public/events", { params: { query: { locale, limit: 5 } } }),
    );
    const event = items.find((item) => !item.ended && item.eventStatus === "SCHEDULED");
    return event
      ? {
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          allDay: event.allDay,
        }
      : null;
  } catch {
    return null;
  }
}
