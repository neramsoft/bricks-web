import { describe, expect, it } from "vitest";
import { siteFixture } from "../../test/fixtures/site";
import { bs } from "@/lib/messages/bs";
import { en } from "@/lib/messages/en";
import { eventSummaryLd } from "./jsonld";
import {
  badgesOf,
  dateTile,
  featuredIndex,
  placeText,
  priceText,
  whenText,
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

describe("whenText", () => {
  it("has the weekday and the hour in Sarajevo", () => {
    expect(whenText(event(), "Europe/Sarajevo", "bs", bs.events)).toBe("petak, 21:00");
    expect(whenText(event({ allDay: true }), "Europe/Sarajevo", "bs", bs.events)).toBe(
      "petak, cijeli dan",
    );
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

describe("featuredIndex", () => {
  it("is the first featured event that is on", () => {
    const list = [
      event(),
      event({ featured: true, eventStatus: "CANCELLED" }),
      event({ featured: true }),
      event({ featured: true }),
    ];
    expect(featuredIndex(list)).toBe(2);
    expect(featuredIndex([event()])).toBe(-1);
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
  it("uses dates for an all-day event", () => {
    const ld = eventSummaryLd({
      ...options,
      event: event({ allDay: true, startsAt: "2026-11-20T00:00:00.000Z" }),
      showsImage: false,
    });
    expect(ld.startDate).toBe("2026-11-20");
  });
});
