import { describe, expect, it } from "vitest";
import { eventFixture as event } from "../../test/fixtures/event";
import { planRevalidation } from "./revalidation";

const set = { defaultLocale: "bs", locales: ["bs", "en"] };

describe("planRevalidation", () => {
  it("rebuilds a page in every language of the event, with the prefix of each", () => {
    const plan = planRevalidation(
      event({ type: "page.published", paths: ["/meni"], locales: ["bs", "en"] }),
      set,
    );
    expect(plan.paths.sort()).toEqual(["/en/meni", "/meni"]);
    expect(plan.tags).toEqual(
      expect.arrayContaining(["page:bs:/meni", "page:en:/meni", "menus", "sitemap", "paths"]),
    );
    expect(plan.all).toBe(false);
  });

  it("rebuilds the home page of each language", () => {
    const plan = planRevalidation(
      event({ type: "page.updated", paths: ["/"], locales: ["bs", "en"] }),
      set,
    );
    expect(plan.paths.sort()).toEqual(["/", "/en"]);
  });

  it("falls back to every language when the event names none", () => {
    const plan = planRevalidation(event({ type: "page.moved", paths: ["/a"] }), set);
    expect(plan.paths.sort()).toEqual(["/a", "/en/a"]);
  });

  it("ignores a path that is not an address", () => {
    const plan = planRevalidation(
      event({ type: "page.deleted", paths: ["meni", "https://evil.test"], locales: ["bs"] }),
      set,
    );
    expect(plan.paths).toEqual([]);
  });

  it("refreshes the menus of the languages named by a menu event", () => {
    const plan = planRevalidation(
      event({ type: "menu.updated", menus: ["header"], locales: ["en"] }),
      set,
    );
    expect(plan.tags).toEqual(["menus", "menus:en"]);
    expect(plan.paths).toEqual([]);
  });

  it("rebuilds the layout and the site data when the settings changed", () => {
    const plan = planRevalidation(event({ type: "settings.updated", groups: ["business"] }), set);
    expect(plan.layout).toBe(true);
    expect(plan.tags).toEqual(expect.arrayContaining(["site", "site:bs", "site:en"]));
    expect(plan.tags).not.toContain("paths");
  });

  it("refreshes the live addresses when the languages changed or no group is named", () => {
    expect(
      planRevalidation(event({ type: "settings.updated", groups: ["languages"] }), set).tags,
    ).toContain("paths");
    expect(planRevalidation(event({ type: "settings.updated" }), set).tags).toContain("paths");
  });

  it("leaves a blog-only settings change alone", () => {
    const plan = planRevalidation(event({ type: "settings.updated", groups: ["blog"] }), set);
    expect(plan).toEqual({ tags: [], paths: [], all: false, layout: false });
  });

  it("expires the tag of each module and rebuilds the pages that hold its block", () => {
    const plan = planRevalidation(
      event({
        type: "module.updated",
        modules: ["menu", "bad key!"],
        paths: ["/"],
        locales: ["bs"],
      }),
      set,
    );
    expect(plan.tags).toEqual(
      expect.arrayContaining(["module:menu", "page:bs:/", "paths", "sitemap"]),
    );
    expect(plan.tags).not.toContain("module:bad key!");
    expect(plan.paths).toEqual(["/"]);
  });

  it("rebuilds the pages that show a changed form", () => {
    const plan = planRevalidation(
      event({ type: "form.updated", paths: ["/rezervacija"], locales: ["bs"], forms: ["f1"] }),
      set,
    );
    expect(plan.tags).toEqual(expect.arrayContaining(["forms", "page:bs:/rezervacija"]));
    expect(plan.paths).toEqual(["/rezervacija"]);
  });

  it("does nothing for a submission, a test or a blog event", () => {
    for (const type of ["form.submitted", "webhook.test", "post.published"] as const) {
      expect(planRevalidation(event({ type, ids: ["x"], paths: ["/blog"] }), set)).toEqual({
        tags: [],
        paths: [],
        all: false,
        layout: false,
      });
    }
  });

  it("drops what was cached from the redirect lookup", () => {
    const plan = planRevalidation(event({ type: "redirects.updated", paths: ["/stari"] }), set);
    expect(plan.tags).toEqual(["redirects"]);
    expect(plan.paths.sort()).toEqual(["/en/stari", "/stari"]);
  });

  it("rebuilds robots and the sitemap for the SEO settings, everything when indexing moved", () => {
    const some = planRevalidation(event({ type: "seo.settings.updated" }), set);
    expect(some.tags).toEqual(["robots", "sitemap"]);
    expect(some.paths).toEqual(["/robots.txt", "/sitemap.xml"]);
    const all = planRevalidation(event({ type: "seo.settings.updated", all: true }), set);
    expect(all.all).toBe(true);
    expect(all.tags).toEqual(expect.arrayContaining(["cms", "pages", "site:en", "menus:bs"]));
  });
});
