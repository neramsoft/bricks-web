import { describe, expect, it } from "vitest";
import { blockFixture } from "../../test/fixtures/page";
import { siteFixture } from "../../test/fixtures/site";
import { parseBlocks } from "@/blocks/parse";
import { businessExtras, recordNodes } from "./block-jsonld";
import { bs } from "./messages/bs";

const context = {
  site: siteFixture(),
  siteUrl: "https://bricks.ba",
  locale: "bs",
  timeZone: "Europe/Sarajevo",
  messages: bs,
  href: "/",
};
const hours = {
  weekly: [{ day: "MONDAY", open: true, intervals: [{ opens: "07:00", closes: "23:00" }] }],
  exceptions: [],
};
const ids = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const blocks = (...list: ReturnType<typeof blockFixture>[]) => parseBlocks(list, () => {});

describe("businessExtras", () => {
  it("is empty when no block shows hours, a position or a menu", () => {
    expect(businessExtras(blocks(blockFixture("statement", { text: "x" })), context)).toEqual({});
  });
  it("takes the hours from an hours block", () => {
    const extras = businessExtras(blocks(blockFixture("openingHours", { hours })), context);
    expect(extras.openingHoursSpecification).toHaveLength(1);
    expect(extras).not.toHaveProperty("geo");
  });
  it("takes the position from a map block", () => {
    const extras = businessExtras(
      blocks(blockFixture("map", { latitude: 44.5, longitude: 18.6 })),
      context,
    );
    expect(extras.geo).toEqual({ "@type": "GeoCoordinates", latitude: 44.5, longitude: 18.6 });
  });
  it("takes hasMenu from a menu block that draws sections, at the page's address", () => {
    const menu = {
      id: ids(1),
      title: "Coffee",
      sections: [{ id: ids(2), title: "Topli", description: null, items: [] }],
      href: null,
    };
    const extras = businessExtras(
      blocks(blockFixture("restaurantMenu", { menuId: ids(1), menu }, { anchorId: "coffee" })),
      { ...context, href: "/meni" },
    );
    expect(extras.hasMenu).toEqual(["https://bricks.ba/meni#coffee"]);
  });
  it("leaves a menu block that drew nothing out", () => {
    const extras = businessExtras(
      blocks(blockFixture("restaurantMenu", { menuId: ids(1), menu: null })),
      context,
    );
    expect(extras).toEqual({});
  });
  it("counts hours only when the contact block lists them", () => {
    const without = blockFixture("contactInfo", { show: ["phone"], info: { hours } });
    expect(businessExtras(blocks(without), context)).toEqual({});
    const withHours = blockFixture("contactInfo", { show: ["hours"], info: { hours } });
    expect(businessExtras(blocks(withHours), context).openingHoursSpecification).toBeTruthy();
  });
});

describe("recordNodes", () => {
  it("makes an Event per listed event and a LocalBusiness per venue", () => {
    const event = {
      id: ids(3),
      href: null,
      startsAt: "2026-11-20T20:00:00Z",
      endsAt: null,
      place: null,
      image: null,
      eventStatus: "SCHEDULED",
      priceType: "FREE",
      price: null,
      category: null,
      title: "Kviz",
      summary: "",
      allDay: false,
      currency: "BAM",
      featured: false,
      ended: false,
      registrationOpen: false,
    };
    const venue = {
      id: ids(4),
      name: "Bricks Tuzla",
      href: null,
      phone: null,
      email: null,
      image: null,
      openNow: null,
      todayHours: null,
      primary: true,
      address: { street: "Slatina do br. 14", postalCode: "75000", city: "Tuzla", country: "BA" },
    };
    const nodes = recordNodes(
      blocks(
        blockFixture("eventList", { events: [event] }, { id: ids(5) }),
        blockFixture("locationList", { locations: [venue] }, { id: ids(6) }),
      ),
      context,
    );
    expect(nodes.map((node) => node["@type"])).toEqual(["Event", ["BarOrPub", "CafeOrCoffeeShop"]]);
    expect(nodes[1]).toMatchObject({ name: "Bricks Tuzla" });
    expect(nodes[1]).not.toHaveProperty("openingHoursSpecification");
  });
});
