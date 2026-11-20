import { describe, expect, it } from "vitest";
import { siteFixture } from "../../test/fixtures/site";
import {
  breadcrumbLd,
  businessTypes,
  graph,
  organizationLd,
  serializeLd,
  websiteLd,
} from "./jsonld";

const site = (business: NonNullable<Parameters<typeof siteFixture>[0]>["business"] = {}) =>
  siteFixture({ business });

describe("businessTypes", () => {
  it("makes a café-bar both a bar and a café", () => {
    expect(businessTypes("BarOrPub")).toEqual(["BarOrPub", "CafeOrCoffeeShop"]);
  });
  it("keeps any other type as it is and defaults to Organization", () => {
    expect(businessTypes("Restaurant")).toBe("Restaurant");
    expect(businessTypes("")).toBe("Organization");
    expect(businessTypes(undefined)).toBe("Organization");
  });
});

describe("organizationLd", () => {
  it("uses the business type and only what the footer shows", () => {
    const ld = organizationLd(site(), "https://bricks.ba");
    expect(ld).toMatchObject({
      "@type": ["BarOrPub", "CafeOrCoffeeShop"],
      "@id": "https://bricks.ba/#organization",
      name: "Bricks",
      legalName: "Bricks d.o.o.",
      url: "https://bricks.ba/",
      email: "info@bricks.ba",
      telephone: "+387 35 000 000",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Ulica 1",
        addressLocality: "Tuzla",
        postalCode: "75000",
        addressCountry: "BA",
      },
      sameAs: ["https://instagram.com/bricks"],
    });
  });

  it("leaves out what is not set", () => {
    const ld = organizationLd(
      site({ email: null, phone: null, addresses: [], social: [], description: null }),
      "https://x.test",
    );
    expect(ld).not.toHaveProperty("email");
    expect(ld).not.toHaveProperty("telephone");
    expect(ld).not.toHaveProperty("address");
    expect(ld).not.toHaveProperty("sameAs");
    expect(ld).not.toHaveProperty("description");
  });

  it("is nothing without a name", () => {
    expect(organizationLd(site({ name: null, legalName: null }), "https://x.test")).toBeNull();
  });
});

describe("websiteLd", () => {
  it("names the site, its language and its publisher", () => {
    expect(websiteLd(site(), "https://x.test", "bs")).toMatchObject({
      "@type": "WebSite",
      name: "Bricks",
      url: "https://x.test/",
      inLanguage: "bs",
      publisher: { "@id": "https://x.test/#organization" },
    });
  });
});

describe("breadcrumbLd", () => {
  it("numbers the crumbs from 1 with absolute addresses", () => {
    expect(
      breadcrumbLd(
        [
          { name: "Home", href: "/en", current: false },
          { name: "Services", href: "/en/services", current: true },
        ],
        "https://x.test",
      ),
    ).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://x.test/en" },
        { "@type": "ListItem", position: 2, name: "Services", item: "https://x.test/en/services" },
      ],
    });
  });
  it("is nothing for the home page", () => {
    expect(breadcrumbLd([], "https://x.test")).toBeNull();
  });
});

describe("graph and serializeLd", () => {
  it("joins the parts that exist", () => {
    expect(graph([null, { "@type": "A" }, null])).toEqual({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "A" }],
    });
    expect(graph([null])).toBeNull();
  });
  it("can't close the script tag", () => {
    expect(serializeLd({ name: "</script><b>" })).not.toContain("</script>");
  });
});
