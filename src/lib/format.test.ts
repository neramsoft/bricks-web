import { describe, expect, it } from "vitest";
import { clock, dayInZone, fill, formatMoney, isoInZone, validTimeZone, weekdayOf } from "./format";

describe("formatMoney", () => {
  it("writes cents as money the way each language does", () => {
    expect(formatMoney(250, "BAM", "bs")).toBe("2,50\u00a0KM");
    expect(formatMoney(4000, "BAM", "bs")).toBe("40,00\u00a0KM");
    expect(formatMoney(250, "BAM", "en")).toBe("KM\u00a02.50");
  });
  it("survives a currency code the runtime does not know", () => {
    expect(formatMoney(250, "??", "bs")).toBe("2.50 ??");
  });
});

describe("time zones", () => {
  it("reads a day and a clock in the venue's zone", () => {
    expect(dayInZone("2026-11-20T23:30:00Z", "Europe/Sarajevo")).toBe("2026-11-21");
    expect(clock("2026-11-20T20:00:00Z", "Europe/Sarajevo", "bs")).toBe("21:00");
    expect(clock("2026-07-20T19:00:00Z", "Europe/Sarajevo", "bs")).toBe("21:00");
    expect(weekdayOf(new Date("2026-11-20T23:30:00Z"), "Europe/Sarajevo")).toBe("SATURDAY");
  });
  it("writes an instant with the zone's offset, in winter and summer", () => {
    expect(isoInZone("2026-11-20T20:00:00Z", "Europe/Sarajevo")).toBe("2026-11-20T21:00:00+01:00");
    expect(isoInZone("2026-07-20T19:00:00Z", "Europe/Sarajevo")).toBe("2026-07-20T21:00:00+02:00");
  });
  it("falls back on Europe/Sarajevo for a zone it does not know", () => {
    expect(validTimeZone("Mars/Olympus")).toBe("Europe/Sarajevo");
    expect(validTimeZone(null)).toBe("Europe/Sarajevo");
    expect(validTimeZone("UTC")).toBe("UTC");
  });
});

describe("fill", () => {
  it("replaces placeholders and leaves unknown ones", () => {
    expect(fill("{a} i {b}", { a: 1 })).toBe("1 i {b}");
  });
});
