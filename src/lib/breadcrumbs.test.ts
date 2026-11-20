import { describe, expect, it } from "vitest";
import { buildCrumbs } from "./breadcrumbs";

const base = { homeLabel: "Početna", locale: "bs", defaultLocale: "bs" };

describe("buildCrumbs", () => {
  it("has none for the home page", () => {
    expect(buildCrumbs({ ...base, isHome: true, trail: [] })).toEqual([]);
  });

  it("starts at the home page and ends at the current page", () => {
    expect(
      buildCrumbs({
        ...base,
        isHome: false,
        trail: [
          { title: "Meni", href: "/meni" },
          { title: "Kafa", href: "/meni/kafa" },
        ],
      }),
    ).toEqual([
      { name: "Početna", href: "/", current: false },
      { name: "Meni", href: "/meni", current: false },
      { name: "Kafa", href: "/meni/kafa", current: true },
    ]);
  });

  it("points home at the language's home page", () => {
    const crumbs = buildCrumbs({
      homeLabel: "Home",
      locale: "en",
      defaultLocale: "bs",
      isHome: false,
      trail: [{ title: "Services", href: "/en/services" }],
    });
    expect(crumbs[0]).toEqual({ name: "Home", href: "/en", current: false });
  });
});
