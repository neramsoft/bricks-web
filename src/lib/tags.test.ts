import { describe, expect, it } from "vitest";
import { MODULE_KEYS, moduleTag, pageTag, tagsForRequest } from "./tags";

describe("pageTag", () => {
  it("folds the case and the slashes as the API does", () => {
    expect(pageTag("en", "/About/")).toBe("page:en:/about");
    expect(pageTag("bs", "")).toBe("page:bs:/");
  });
});

describe("tagsForRequest", () => {
  const tags = (path: string) => tagsForRequest(new URL(`http://api.test${path}`));

  it("tags a page by language and address, and with every module and the forms", () => {
    expect(tags("/v1/public/pages?path=%2Fmeni&locale=en")).toEqual([
      "cms",
      "pages",
      "page:en:/meni",
      "forms",
      ...MODULE_KEYS.map(moduleTag),
    ]);
    expect(tags("/v1/public/pages?locale=bs")).toContain("page:bs:/");
  });

  it("tags the shared reads", () => {
    expect(tags("/v1/public/site?locale=en")).toEqual(["cms", "site", "site:en"]);
    expect(tags("/v1/public/menus?locale=bs")).toEqual(["cms", "menus", "menus:bs"]);
    expect(tags("/v1/public/modules")).toEqual(["cms", "site"]);
    expect(tags("/v1/public/pages/sitemap")).toEqual(["cms", "sitemap"]);
    expect(tags("/v1/public/robots")).toEqual(["cms", "robots"]);
    expect(tags("/v1/public/redirects/resolve?path=%2Fa")).toEqual(["cms", "redirects"]);
    expect(tags("/v1/public/forms/abc")).toEqual(["cms", "forms"]);
    expect(tags("/v1/public/paths")).toEqual(["cms", "paths"]);
  });

  it("tags the records of the modules the site draws", () => {
    expect(tags("/v1/public/restaurant-menus?locale=bs")).toEqual(["cms", "module:menu"]);
    expect(tags("/v1/public/restaurant-menus/by-slug/pica")).toEqual([
      "cms",
      "module:menu",
      "module:locations",
    ]);
    expect(tags("/v1/public/events?locale=bs")).toEqual([
      "cms",
      "module:events",
      "module:locations",
    ]);
    expect(tags("/v1/public/locations")).toEqual(["cms", "module:locations"]);
    expect(tags("/v1/public/galleries/by-slug/a")).toEqual(["cms", "module:gallery"]);
  });

  it("only tags the cache with the unknown as 'cms'", () => {
    expect(tags("/v1/public/something-new")).toEqual(["cms"]);
  });
});
