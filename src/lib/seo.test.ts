import { describe, expect, it } from "vitest";
import { canonicalUrl, documentTitle, hreflangLanguages, robotsFor } from "./seo";

const options = { siteUrl: "https://bricks.ba", defaultLocale: "bs" };

describe("hreflangLanguages", () => {
  it("lists only the translations that exist, with x-default", () => {
    expect(
      hreflangLanguages(
        [
          { locale: "bs", href: "/meni" },
          { locale: "en", href: "/en/services" },
        ],
        options,
      ),
    ).toEqual({
      bs: "https://bricks.ba/meni",
      en: "https://bricks.ba/en/services",
      "x-default": "https://bricks.ba/meni",
    });
  });

  it("says nothing for a page that has no translation", () => {
    expect(hreflangLanguages([{ locale: "bs", href: "/meni" }], options)).toBeUndefined();
    expect(hreflangLanguages([], options)).toBeUndefined();
  });

  it("says nothing when the site switched hreflang off", () => {
    expect(
      hreflangLanguages(
        [
          { locale: "bs", href: "/" },
          { locale: "en", href: "/en" },
        ],
        { ...options, enabled: false },
      ),
    ).toBeUndefined();
  });

  it("has no x-default when the default language has no version of the page", () => {
    const languages = hreflangLanguages(
      [
        { locale: "en", href: "/en/a" },
        { locale: "de", href: "/de/a" },
      ],
      options,
    );
    expect(languages).toEqual({
      en: "https://bricks.ba/en/a",
      de: "https://bricks.ba/de/a",
    });
  });
});

describe("canonicalUrl", () => {
  it("is the page's own address", () => {
    expect(canonicalUrl({ siteUrl: "https://x.test", href: "/en/a" })).toBe("https://x.test/en/a");
  });
  it("takes the CMS override", () => {
    expect(
      canonicalUrl({ siteUrl: "https://x.test", href: "/a", override: "https://other.test/a" }),
    ).toBe("https://other.test/a");
    expect(canonicalUrl({ siteUrl: "https://x.test", href: "/a", override: null })).toBe(
      "https://x.test/a",
    );
  });
});

describe("documentTitle", () => {
  it("adds the site name once", () => {
    expect(documentTitle({ title: "Meni", siteName: "Bricks", isHome: false })).toBe(
      "Meni | Bricks",
    );
  });
  it("leaves the home title and a title with the name alone", () => {
    expect(documentTitle({ title: "Softver", siteName: "Bricks", isHome: true })).toBe("Softver");
    expect(documentTitle({ title: "O Bricks", siteName: "Bricks", isHome: false })).toBe(
      "O Bricks",
    );
    expect(documentTitle({ title: "Meni", siteName: null, isHome: false })).toBe("Meni");
  });
});

describe("robotsFor", () => {
  it("follows links on a noindex page", () => {
    expect(robotsFor(true)).toEqual({ index: false, follow: true });
    expect(robotsFor(false)).toEqual({ index: true, follow: true });
  });
});
