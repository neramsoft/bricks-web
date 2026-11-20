import { describe, expect, it } from "vitest";
import { bs } from "./messages/bs";
import { en } from "./messages/en";
import { nowLine, nowState, type NowInput } from "./now-line";

// Europe/Sarajevo is UTC+1 in winter and UTC+2 in summer. The hours are 07:00 to 23:00 unless a test says otherwise.
const today = (
  date: string,
  intervals = [{ opens: "07:00", closes: "23:00" }],
  closed = false,
) => ({
  date,
  closed,
  intervals,
});
const at = (iso: string) => new Date(iso);

const base = (over: Partial<NowInput>): NowInput => ({
  openNow: true,
  today: today("2026-11-20"),
  event: null,
  timeZone: "Europe/Sarajevo",
  locale: "bs",
  now: at("2026-11-20T12:00:00+01:00"),
  ...over,
});

describe("nowState", () => {
  it("is open until the closing time while an interval runs", () => {
    expect(nowState(base({}))).toEqual({ kind: "open", until: "23:00" });
  });

  it("is closed, with the opening time, long before opening", () => {
    const state = nowState(base({ openNow: false, now: at("2026-11-20T04:30:00+01:00") }));
    expect(state).toEqual({ kind: "closedOpensAt", at: "07:00" });
  });

  it("is opening soon within the hour before opening", () => {
    const state = nowState(base({ openNow: false, now: at("2026-11-20T06:15:00+01:00") }));
    expect(state).toEqual({ kind: "openingSoon", at: "07:00" });
  });

  it("is closed after the last interval of the day", () => {
    expect(nowState(base({ openNow: false, now: at("2026-11-20T23:30:00+01:00") }))).toEqual({
      kind: "closed",
    });
  });

  it("says a closed day is closed", () => {
    const state = nowState(base({ openNow: false, today: today("2026-11-20", [], true) }));
    expect(state).toEqual({ kind: "closedToday" });
  });

  it("reads the clock in the venue's zone, not the server's", () => {
    // 22:30 UTC is 23:30 in Sarajevo in November: closed there, though open in UTC's day.
    const state = nowState(base({ openNow: false, now: at("2026-11-20T22:30:00Z") }));
    expect(state.kind).toBe("closed");
    // In summer the same UTC time is 00:30 the next day: the page's day has passed.
    const summer = nowState(
      base({ today: today("2026-07-20"), openNow: true, now: at("2026-07-20T22:30:00Z") }),
    );
    expect(summer).toEqual({ kind: "open", until: null });
  });

  it("runs past midnight: open until the late closing time, and still open after midnight", () => {
    const late = today("2026-11-20", [{ opens: "18:00", closes: "02:00" }]);
    expect(nowState(base({ today: late, now: at("2026-11-20T23:30:00+01:00") }))).toEqual({
      kind: "open",
      until: "02:00",
    });
    // 00:30 the next day: the API's `today` is the new day's hours; `openNow` carries the tail of the night.
    const after = today("2026-11-21", [{ opens: "18:00", closes: "02:00" }]);
    expect(
      nowState(base({ today: after, openNow: true, now: at("2026-11-21T00:30:00+01:00") })),
    ).toEqual({ kind: "open", until: null });
    // ... and closed after the tail has ended.
    expect(
      nowState(base({ today: after, openNow: false, now: at("2026-11-21T09:00:00+01:00") })),
    ).toEqual({ kind: "closedOpensAt", at: "18:00" });
  });

  it("falls back on the API's flag without hours", () => {
    expect(nowState(base({ today: null, openNow: false }))).toEqual({ kind: "closed" });
    expect(nowState(base({ today: null, openNow: null }))).toEqual({ kind: "unknown" });
  });

  it("does not trust times of another day than the clock's", () => {
    const stale = today("2026-11-19");
    expect(nowState(base({ today: stale, openNow: true }))).toEqual({ kind: "open", until: null });
  });
});

describe("nowLine", () => {
  const event = {
    title: "Akustika petkom",
    startsAt: "2026-11-20T20:00:00Z",
    endsAt: null,
    allDay: false,
  };

  it("words the headline in the language and colours the evening", () => {
    const evening = nowLine(base({ now: at("2026-11-20T19:00:00+01:00") }), bs.now);
    expect(evening.headline).toBe("Otvoreno do 23:00");
    expect(evening.mode).toBe("evening");
    expect(nowLine(base({}), en.now)).toMatchObject({ headline: "Open until 23:00", mode: "day" });
  });

  it("names a coming event tonight with its time in Sarajevo", () => {
    const line = nowLine(base({ event, now: at("2026-11-20T12:00:00+01:00") }), bs.now);
    expect(line.event).toBe("Večeras: Akustika petkom, 21:00");
  });

  it("names a later event with its weekday", () => {
    const later = { ...event, startsAt: "2026-11-27T20:00:00Z" };
    expect(nowLine(base({ event: later }), bs.now).event).toBe(
      "Sljedeće: Akustika petkom, petak u 21:00",
    );
  });

  it("leaves out an event that is over", () => {
    const over = { ...event, startsAt: "2026-11-20T09:00:00Z" };
    expect(nowLine(base({ event: over }), bs.now).event).toBeNull();
  });

  it("words an all-day event by its day", () => {
    const festival = {
      title: "Festival",
      startsAt: "2026-11-20T00:00:00+01:00",
      endsAt: null,
      allDay: true,
    };
    expect(nowLine(base({ event: festival }), bs.now).event).toBe("Danas: Festival");
  });
});
