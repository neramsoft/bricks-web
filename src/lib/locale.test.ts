import { describe, expect, it } from "vitest";
import { absoluteUrl, localizedHref, normalizePath, parseRoute, splitPathname } from "./locale";

const set = { defaultLocale: "bs", locales: ["bs", "en", "de"] };

describe("normalizePath", () => {
  it("makes one clean path", () => {
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("a//b/")).toBe("/a/b");
    expect(normalizePath("/a/b")).toBe("/a/b");
  });
});

describe("parseRoute", () => {
  it("reads the home page of the default language", () => {
    expect(parseRoute(undefined, set)).toEqual({ locale: "bs", path: "/" });
    expect(parseRoute([], set)).toEqual({ locale: "bs", path: "/" });
  });

  it("gives the default language no prefix", () => {
    expect(parseRoute(["meni", "kafa"], set)).toEqual({
      locale: "bs",
      path: "/meni/kafa",
    });
  });

  it("reads a language prefix", () => {
    expect(parseRoute(["en"], set)).toEqual({ locale: "en", path: "/" });
    expect(parseRoute(["de", "kontakt"], set)).toEqual({ locale: "de", path: "/kontakt" });
    expect(parseRoute(["EN", "About"], set)).toEqual({ locale: "en", path: "/About" });
  });

  it("refuses the default language's own prefix", () => {
    expect(parseRoute(["bs"], set)).toBeNull();
    expect(parseRoute(["bs", "meni"], set)).toBeNull();
  });

  it("treats a language the site does not have as a page of the default language", () => {
    expect(parseRoute(["fr", "contact"], set)).toEqual({ locale: "bs", path: "/fr/contact" });
  });

  it("keeps a language prefix that is not first", () => {
    expect(parseRoute(["meni", "en"], set)).toEqual({ locale: "bs", path: "/meni/en" });
  });

  it("decodes percent-encoded segments and survives bad ones", () => {
    expect(parseRoute(["en", "o%20nama"], set)).toEqual({ locale: "en", path: "/o nama" });
    expect(parseRoute(["%E0%A4%A"], set)).toEqual({ locale: "bs", path: "/%E0%A4%A" });
  });

  it("follows the languages it is given", () => {
    expect(parseRoute(["de"], { defaultLocale: "bs", locales: ["bs", "en"] })).toEqual({
      locale: "bs",
      path: "/de",
    });
    expect(parseRoute(["en"], { defaultLocale: "en", locales: ["en", "bs"] })).toBeNull();
    expect(parseRoute(["bs", "x"], { defaultLocale: "en", locales: ["en", "bs"] })).toEqual({
      locale: "bs",
      path: "/x",
    });
  });
});

describe("splitPathname", () => {
  it("splits a requested pathname", () => {
    expect(splitPathname("/en/about", set)).toEqual({ locale: "en", path: "/about" });
    expect(splitPathname("/", set)).toEqual({ locale: "bs", path: "/" });
  });
});

describe("localizedHref", () => {
  it("prefixes every language but the default", () => {
    expect(localizedHref("bs", "/", "bs")).toBe("/");
    expect(localizedHref("bs", "/about", "bs")).toBe("/about");
    expect(localizedHref("en", "/", "bs")).toBe("/en");
    expect(localizedHref("en", "/about/team", "bs")).toBe("/en/about/team");
    expect(localizedHref("en", "about", "bs")).toBe("/en/about");
  });
});

describe("absoluteUrl", () => {
  it("joins the origin and a path", () => {
    expect(absoluteUrl("https://bricks.ba", "/")).toBe("https://bricks.ba/");
    expect(absoluteUrl("https://bricks.ba/", "/en/a")).toBe("https://bricks.ba/en/a");
    expect(absoluteUrl("https://x.test", "a")).toBe("https://x.test/a");
  });
  it("leaves an absolute address alone", () => {
    expect(absoluteUrl("https://x.test", "https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
  });
});
