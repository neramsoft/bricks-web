import { describe, expect, it } from "vitest";
import { pageFixture } from "../../test/fixtures/page";
import { siteFixture } from "../../test/fixtures/site";
import { pageMetadata } from "./page-metadata";

const siteUrl = "https://bricks.ba";
const base = { site: siteFixture(), siteUrl, locale: "bs" };

describe("pageMetadata", () => {
  it("has the canonical, the hreflang alternates and x-default of the translations", () => {
    const meta = pageMetadata({ ...base, page: pageFixture() });
    expect(meta.alternates).toEqual({
      canonical: "https://bricks.ba/meni",
      languages: {
        bs: "https://bricks.ba/meni",
        en: "https://bricks.ba/en/menu",
        "x-default": "https://bricks.ba/meni",
      },
    });
  });

  it("uses the CMS's canonical override", () => {
    const meta = pageMetadata({
      ...base,
      page: pageFixture({ seo: { canonicalUrl: "https://bricks.ba/drugo" } }),
    });
    expect(meta.alternates?.canonical).toBe("https://bricks.ba/drugo");
  });

  it("leaves hreflang out with no translation or when the site switched it off", () => {
    const single = pageFixture({ alternates: [{ locale: "bs", path: "/meni", href: "/meni" }] });
    expect(pageMetadata({ ...base, page: single }).alternates).toEqual({
      canonical: "https://bricks.ba/meni",
    });
    const off = siteFixture({ localization: { autoSuggestLanguage: false, hreflang: false } });
    expect(pageMetadata({ ...base, site: off, page: pageFixture() }).alternates).toEqual({
      canonical: "https://bricks.ba/meni",
    });
  });

  it("is indexable by default and noindex when the page, the site or a preview says so", () => {
    expect(pageMetadata({ ...base, page: pageFixture() }).robots).toEqual({
      index: true,
      follow: true,
    });
    const page = pageFixture({ seo: { noindex: true } });
    expect(pageMetadata({ ...base, page }).robots).toEqual({ index: false, follow: true });
    const closed = siteFixture({ indexing: false });
    expect(pageMetadata({ ...base, site: closed, page: pageFixture() }).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(pageMetadata({ ...base, page: pageFixture(), preview: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it("gives a draft no canonical and no alternates", () => {
    expect(
      pageMetadata({ ...base, page: pageFixture(), preview: true }).alternates,
    ).toBeUndefined();
  });

  it("builds the title once, with the site name, and the home page alone", () => {
    expect(pageMetadata({ ...base, page: pageFixture() }).title).toEqual({
      absolute: "Meni | Bricks",
    });
    const home = pageFixture({ isHome: true, seo: { title: "Bricks café-bar" } });
    expect(pageMetadata({ ...base, page: home }).title).toEqual({ absolute: "Bricks café-bar" });
  });

  it("carries the same title, description, address and image to Open Graph and Twitter", () => {
    const image = {
      id: "00000000-0000-4000-8000-000000000002",
      width: 1200,
      height: 630,
      alt: null,
      caption: null,
      credit: null,
      focalPoint: { x: 0.5, y: 0.5 },
      dominantColor: null,
      placeholder: null,
      variants: [],
      url: "/media/og.jpg",
      mimeType: "image/jpeg",
    };
    const meta = pageMetadata({ ...base, page: pageFixture({ seo: { ogImage: image } }) });
    expect(meta.description).toBe("Piće i hrana u Bricksu");
    expect(meta.openGraph).toMatchObject({
      url: "https://bricks.ba/meni",
      title: "Meni",
      description: "Piće i hrana u Bricksu",
      siteName: "Bricks",
      locale: "bs_BA",
      images: [{ url: "https://bricks.ba/media/og.jpg", width: 1200, height: 630, alt: "Meni" }],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "Meni" });
    expect(pageMetadata({ ...base, page: pageFixture() }).twitter).toMatchObject({
      card: "summary",
    });
  });
});
