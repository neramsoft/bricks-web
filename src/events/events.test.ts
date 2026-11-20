import { describe, expect, it } from "vitest";
import { siteFixture } from "../../test/fixtures/site";
import { bs } from "@/lib/messages/bs";
import { en } from "@/lib/messages/en";
import { eventSummaryLd } from "./jsonld";
import {
  badgesOf,
  dateTile,
  entryText,
  fullWhenText,
  icsUrl,
  placeText,
  priceText,
  rowWhenText,
  slugOfHref,
  splitEvents,
  timeRange,
  type EventSummary,
} from "./view-model";

const event = (more: Partial<EventSummary> = {}): EventSummary => ({
  id: "e1",
  href: null,
  startsAt: "2026-11-20T20:00:00.000Z",
  endsAt: null,
  place: {
    locationId: null,
    href: null,
    address: { street: "Slatina do br. 14", postalCode: "75000", city: "Tuzla", country: "BA" },
    addressText: null,
    latitude: null,
    longitude: null,
    name: "Bricks Tuzla",
  },
  image: null,
  eventStatus: "SCHEDULED",
  priceType: "FREE",
  price: null,
  category: "Live muzika",
  title: "Akustika petkom",
  summary: "Gitara i vokal.",
  allDay: false,
  currency: "BAM",
  featured: false,
  ended: false,
  registrationOpen: false,
  ...more,
});

describe("dateTile", () => {
  it("takes the day from the venue's clock, not UTC's", () => {
    expect(dateTile("2026-11-20T20:00:00Z", "Europe/Sarajevo", "bs")).toEqual({
      day: "20",
      month: "nov",
    });
    // 23:30 UTC is already the 21st in Sarajevo.
    expect(dateTile("2026-11-20T23:30:00Z", "Europe/Sarajevo", "bs")).toEqual({
      day: "21",
      month: "nov",
    });
    expect(dateTile("2026-12-04T20:00:00Z", "Europe/Sarajevo", "bs").month).toBe("dec");
    expect(dateTile("2026-12-04T20:00:00Z", "Europe/Sarajevo", "en").month).toBe("dec");
  });
});

describe("timeRange and the when lines", () => {
  const zone = "Europe/Sarajevo";
  it("gives the hours, with the end when there is one", () => {
    expect(timeRange(event(), zone, "bs", bs.events)).toBe("21:00");
    expect(timeRange(event({ endsAt: "2026-11-20T22:30:00.000Z" }), zone, "bs", bs.events)).toBe(
      "21:00\u201323:30",
    );
    expect(timeRange(event({ allDay: true }), zone, "bs", bs.events)).toBe("cijeli dan");
  });

  it("names the day of an end after midnight on the venue's clock", () => {
    // 21:00 to 01:00 the next day in Sarajevo (UTC 20:00 to 00:00).
    const night = event({ endsAt: "2026-11-21T00:00:00.000Z" });
    expect(timeRange(night, zone, "bs", bs.events)).toBe("21:00\u2013sub 01:00");
    expect(timeRange(night, zone, "en", en.events)).toBe("21:00\u2013Sat 01:00");
    // 23:30 to 00:45 Sarajevo: the same UTC day, but across midnight on the venue's clock.
    const late = event({
      startsAt: "2026-11-20T22:30:00.000Z",
      endsAt: "2026-11-20T23:45:00.000Z",
    });
    expect(timeRange(late, zone, "bs", bs.events)).toBe("23:30\u2013sub 00:45");
    // The same hours inside one Sarajevo day carry no weekday.
    const same = event({
      startsAt: "2026-11-20T18:30:00.000Z",
      endsAt: "2026-11-20T21:45:00.000Z",
    });
    expect(timeRange(same, zone, "bs", bs.events)).toBe("19:30\u201322:45");
  });

  it("builds a row's and the wide card's lines", () => {
    const e = event({ endsAt: "2026-11-20T22:00:00.000Z" });
    expect(rowWhenText(e, zone, "bs", bs.events)).toBe("petak, 21:00\u201323:00");
    expect(fullWhenText(e, zone, "bs", bs.events)).toBe(
      "petak, 20. novembra \u00b7 21:00\u201323:00",
    );
    expect(fullWhenText(e, zone, "en", en.events)).toBe(
      "Friday, 20 November \u00b7 21:00\u201323:00",
    );
  });
});

describe("entryText", () => {
  it("says free entry in words and the rest as the price", () => {
    expect(entryText(event(), "bs", bs.events)).toBe("Bez ulaza");
    expect(entryText(event(), "en", en.events)).toBe("Free entry");
    expect(entryText(event({ priceType: "FIXED", price: 1000 }), "bs", bs.events)).toBe(
      "10,00\u00a0KM",
    );
    expect(entryText(event({ priceType: "FROM", price: 500 }), "bs", bs.events)).toBe(
      "od 5,00\u00a0KM",
    );
    expect(entryText(event({ priceType: "FROM", price: null }), "bs", bs.events)).toBeNull();
  });
});

describe("icsUrl and slugOfHref", () => {
  it("is the CMS's public file address, not a data address", () => {
    expect(icsUrl("https://api.bricks.ba", "abc")).toBe(
      "https://api.bricks.ba/v1/public/events/abc/ics",
    );
    expect(icsUrl("https://api.bricks.ba/", "abc")).toBe(
      "https://api.bricks.ba/v1/public/events/abc/ics",
    );
  });
  it("takes the slug from the event's own address", () => {
    expect(slugOfHref("/dogadjaji/akustika-petkom")).toBe("akustika-petkom");
    expect(slugOfHref("/en/events/acoustic/?x=1")).toBe("acoustic");
    expect(slugOfHref(null)).toBeNull();
  });
});

describe("priceText", () => {
  it("words each kind of price", () => {
    expect(priceText(event(), "bs", bs.events)).toBe("Besplatno");
    expect(priceText(event({ priceType: "FIXED", price: 1000 }), "bs", bs.events)).toBe(
      "10,00\u00a0KM",
    );
    expect(priceText(event({ priceType: "FROM", price: 500 }), "en", en.events)).toBe(
      "from KM\u00a05.00",
    );
    expect(priceText(event({ priceType: "ON_REQUEST" }), "bs", bs.events)).toBe("Cijena na upit");
    expect(priceText(event({ priceType: "FIXED", price: null }), "bs", bs.events)).toBeNull();
  });
});

describe("placeText and badges", () => {
  it("puts the address after the name", () => {
    expect(placeText(event().place)).toBe("Bricks Tuzla, Slatina do br. 14, 75000 Tuzla");
    expect(placeText(null)).toBeNull();
  });
  it("shows the state of an event that is not on as planned", () => {
    expect(badgesOf(event({ eventStatus: "CANCELLED" }), bs.events)).toEqual(["Otkazano"]);
    expect(badgesOf(event({ ended: true }), bs.events)).toEqual(["Završeno"]);
    expect(badgesOf(event({ registrationOpen: true }), bs.events)).toEqual(["Prijave su otvorene"]);
  });
});

describe("splitEvents", () => {
  it("makes the first event that is not over the wide one, whatever the featured flag", () => {
    const list = [
      event({ id: "old", ended: true }),
      event({ id: "next" }),
      event({ id: "flagged", featured: true }),
    ];
    const { first, rest } = splitEvents(list);
    expect(first?.id).toBe("next");
    expect(rest.map((e) => e.id)).toEqual(["old", "flagged"]);
  });
  it("keeps a cancelled next event as the wide one (it shows as cancelled)", () => {
    expect(splitEvents([event({ id: "c", eventStatus: "CANCELLED" }), event()]).first?.id).toBe(
      "c",
    );
  });
  it("has no wide card when everything is over, or when there is nothing", () => {
    expect(splitEvents([event({ ended: true })]).first).toBeNull();
    expect(splitEvents([event({ ended: true })]).rest).toHaveLength(1);
    expect(splitEvents([])).toEqual({ first: null, rest: [] });
  });
});

describe("eventSummaryLd", () => {
  const options = {
    site: siteFixture(),
    siteUrl: "https://bricks.ba",
    timeZone: "Europe/Sarajevo",
    locale: "bs",
    messages: bs.events,
  };
  it("carries what the card shows, with the venue's offset", () => {
    const ld = eventSummaryLd({ ...options, event: event(), showsImage: false });
    expect(ld).toMatchObject({
      "@type": "Event",
      name: "Akustika petkom",
      description: "Gitara i vokal.",
      startDate: "2026-11-20T21:00:00+01:00",
      eventStatus: "https://schema.org/EventScheduled",
      location: { "@type": "Place", name: "Bricks Tuzla" },
      offers: { "@type": "Offer", price: 0, priceCurrency: "BAM" },
    });
    expect(ld).not.toHaveProperty("image");
  });
  it("names the picture only for the card that shows it, and no offer for a price on request", () => {
    const withImage = event({
      image: { url: "/m/a.png" } as EventSummary["image"],
      priceType: "ON_REQUEST",
    });
    const ld = eventSummaryLd({ ...options, event: withImage, showsImage: true });
    expect(ld.image).toEqual(["https://bricks.ba/m/a.png"]);
    expect(ld).not.toHaveProperty("offers");
  });
  it("has the end only when the card shows it, and the performers only when shown", () => {
    const e = event({ endsAt: "2026-11-20T22:00:00.000Z" });
    const ld = eventSummaryLd({
      ...options,
      event: e,
      showsImage: false,
      performers: ["Duo Slatina", "Amar"],
    });
    expect(ld.endDate).toBe("2026-11-20T23:00:00+01:00");
    expect(ld.performer).toEqual([
      { "@type": "Person", name: "Duo Slatina" },
      { "@type": "Person", name: "Amar" },
    ]);
    const plain = eventSummaryLd({ ...options, event: event(), showsImage: false });
    expect(plain).not.toHaveProperty("endDate");
    expect(plain).not.toHaveProperty("performer");
    const allDay = eventSummaryLd({
      ...options,
      event: event({ allDay: true, endsAt: "2026-11-21T00:00:00.000Z" }),
      showsImage: false,
    });
    expect(allDay).not.toHaveProperty("endDate");
  });

  it("uses dates for an all-day event", () => {
    const ld = eventSummaryLd({
      ...options,
      event: event({ allDay: true, startsAt: "2026-11-20T00:00:00.000Z" }),
      showsImage: false,
    });
    expect(ld.startDate).toBe("2026-11-20");
  });
});
