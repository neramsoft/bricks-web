import { describe, expect, it } from "vitest";
import type { PublicMenus } from "@probiz/sdk";
import { siteFixture } from "../../test/fixtures/site";
import { buildLlmsTxt, hoursInWords, type LlmsLanguage } from "./llms-txt";
import { messagesFor } from "./messages";

const item = (label: string, href: string, external = false) => ({
  id: "00000000-0000-4000-8000-000000000001",
  label,
  href,
  external,
  openInNewTab: false,
  children: [],
});
const menus = (items: ReturnType<typeof item>[]): PublicMenus => ({
  locale: "bs",
  menus: [{ key: "header", name: "Header", items }],
});

const week = (open: [string, string], weekend: [string, string] | null) =>
  (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const).map(
    (day, index) => {
      const hours = index >= 5 ? weekend : open;
      return {
        day,
        open: hours !== null,
        intervals: hours ? [{ opens: hours[0], closes: hours[1] }] : [],
      };
    },
  );

const site = siteFixture({
  business: {
    name: "Bricks",
    description: "Café-bar u Tuzli.\nKafa, pivo, ljudi.",
    openingHours: { weekly: week(["07:00", "23:00"], ["09:00", "01:00"]), exceptions: [] },
  },
});

const languages: LlmsLanguage[] = [
  {
    locale: "bs",
    name: "Bosanski",
    isDefault: true,
    menus: menus([
      item("Meni", "/#meni"),
      item("Pivo", "/#beer"),
      item("Meni opet", "/#meni"),
      item("Instagram", "https://instagram.com/bricks", true),
    ]),
    pages: [
      { href: "/galerija", title: "Galerija" },
      { href: "/", title: "Bricks Tuzla" },
      { href: "/privatnost", title: "Pravila privatnosti" },
    ],
  },
  {
    locale: "en",
    name: "English",
    isDefault: false,
    menus: menus([item("Menu", "/en/#meni"), item("Book [a] table", "/en/#rezervacija")]),
    pages: [{ href: "/en/gallery", title: "Gallery" }],
  },
];

const build = (modules: string[] | null = ["menu", "ordering"], hasForm = true) =>
  buildLlmsTxt({ siteUrl: "https://bricks.ba/", site, modules, hasForm, languages });

describe("buildLlmsTxt", () => {
  it("starts with an H1 of the business name and a one-line summary", () => {
    const lines = build().split("\n");
    expect(lines[0]).toBe("# Bricks");
    expect(lines[2]).toBe("> Café-bar u Tuzli. Kafa, pivo, ljudi.");
  });

  it("has an H2 section of Markdown links for each language, with absolute addresses", () => {
    const text = build();
    expect(text).toContain("## Bosanski\n");
    expect(text).toContain("## English\n");
    expect(text).toContain("- [Meni](https://bricks.ba/#meni)");
    expect(text).toContain("- [Pivo](https://bricks.ba/#beer)");
    expect(text).toContain("- [Galerija](https://bricks.ba/galerija)");
    expect(text).toContain("- [Gallery](https://bricks.ba/en/gallery)");
    expect(text).toContain("- [Menu](https://bricks.ba/en/#meni)");
    expect(text).toContain("(https://bricks.ba/sitemap.xml)");
    // Every link is absolute.
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) expect(target).toMatch(/^https:\/\//);
  });

  it("lists the home page first", () => {
    const section = build().split("## Bosanski\n\n")[1]!;
    expect(section.split("\n")[0]).toBe("- [Bricks Tuzla](https://bricks.ba/)");
  });

  it("leaves out external and repeated links, and brackets inside a label", () => {
    const text = build();
    expect(text).not.toContain("instagram");
    expect(text).not.toContain("Meni opet");
    expect(text).toContain("- [Book a table](https://bricks.ba/en/#rezervacija)");
  });

  it("describes the address, the hours in words and what a visitor can do", () => {
    const text = build();
    expect(text).toContain("Adresa: Ulica 1, 75000 Tuzla.");
    expect(text).toContain(
      "Radno vrijeme: ponedjeljak–petak 07:00–23:00; subota, nedjelja 09:00–01:00.",
    );
    expect(text).toContain(
      "Na web stranici možeš pogledati meni, rezervisati sto i naručiti sa stola skeniranjem QR koda.",
    );
  });

  it("names only what the switched-on modules allow, and nothing when they are unknown", () => {
    expect(build(["menu"], false)).toContain("možeš pogledati meni.");
    expect(build(null, false)).not.toContain("Na web stranici");
  });

  it("names reserving when a page carries a form, although forms are not an optional module", () => {
    // The live site's module list: forms are part of the CMS core and never in it.
    const live = ["gallery", "events", "menu", "ordering", "locations", "mcp"];
    expect(build(live, true)).toContain("rezervisati sto");
    expect(build(live, false)).not.toContain("rezervisati sto");
    expect(build(null, true)).toContain("rezervisati sto");
  });

  it("is Markdown with at least one link and no HTML", () => {
    const text = build();
    expect(text).toMatch(/^# .+/);
    expect(text).toMatch(/\[[^\]]+\]\(https:\/\/[^)]+\)/);
    expect(text).not.toMatch(/<\w+/);
  });
});

describe("hoursInWords", () => {
  it("names a closed day and groups the rest", () => {
    const hours = {
      weekly: week(["10:00", "20:00"], null),
      exceptions: [],
    };
    expect(hoursInWords(hours, "en", messagesFor("en"))).toBe(
      "Monday–Friday 10:00–20:00; Saturday, Sunday closed",
    );
  });

  it("is null without a week", () => {
    expect(hoursInWords({ weekly: [], exceptions: [] }, "bs", messagesFor("bs"))).toBeNull();
  });
});
