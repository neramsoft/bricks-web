import { describe, expect, it } from "vitest";
import { openingHoursSpecification } from "./hours-ld";
import { todayHoursText } from "./hours-summary";
import { bs } from "./messages/bs";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
const hours = (open: (day: (typeof DAYS)[number]) => Array<{ opens: string; closes: string }>) => ({
  weekly: DAYS.map((day) => ({ day, open: open(day).length > 0, intervals: open(day) })),
  exceptions: [],
});

describe("openingHoursSpecification", () => {
  it("shares one entry between days with the same hours", () => {
    const spec = openingHoursSpecification(hours(() => [{ opens: "07:00", closes: "23:00" }]));
    expect(spec).toHaveLength(1);
    expect(spec[0]).toMatchObject({ opens: "07:00", closes: "23:00" });
    expect(spec[0]?.dayOfWeek).toHaveLength(7);
  });
  it("leaves closed days out, writes 24:00 as the day's last minute and exceptions by date", () => {
    const week = hours((day) => (day === "SUNDAY" ? [] : [{ opens: "08:00", closes: "24:00" }]));
    week.exceptions = [{ date: "2026-12-25", closed: true, label: null, intervals: [] }] as never;
    const spec = openingHoursSpecification(week);
    expect(spec[0]).toMatchObject({ closes: "23:59" });
    expect((spec[0]!.dayOfWeek as string[]).length).toBe(6);
    expect(spec[1]).toMatchObject({ opens: "00:00", closes: "00:00", validFrom: "2026-12-25" });
  });
});

describe("todayHoursText", () => {
  const week = hours((day) => (day === "SUNDAY" ? [] : [{ opens: "07:00", closes: "23:00" }]));
  it("words today's hours in the venue's zone", () => {
    // Friday in Sarajevo.
    expect(todayHoursText(week, new Date("2026-11-20T12:00:00Z"), "Europe/Sarajevo", bs)).toBe(
      "Danas 07:00–23:00",
    );
    // Saturday 00:30 in Sarajevo is still Friday in UTC.
    expect(todayHoursText(week, new Date("2026-11-21T23:30:00Z"), "Europe/Sarajevo", bs)).toBe(
      "Danas zatvoreno",
    );
  });
  it("has nothing without hours", () => {
    expect(todayHoursText({ weekly: [], exceptions: [] }, new Date(), "UTC", bs)).toBeNull();
  });
});
