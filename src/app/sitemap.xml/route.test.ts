import { beforeEach, describe, expect, it, vi } from "vitest";

let items: unknown[] = [];

vi.mock("@/lib/api", async () => {
  const { createProbizClient } = await import("@probiz/sdk");
  const client = createProbizClient({
    baseUrl: "http://api.test",
    fetch: async () => Response.json({ items, nextCursor: null }),
  });
  return { cms: () => client };
});

beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubEnv("SITE_URL", "https://bricks.ba");
  vi.resetModules();
});

describe("GET /sitemap.xml", () => {
  it("lists the CMS's pages with absolute addresses and their translations", async () => {
    items = [
      {
        type: "page",
        lastmod: "2026-11-01T10:00:00.000Z",
        locale: "bs",
        path: "/meni",
        href: "/meni",
        images: [],
        alternates: [
          { locale: "bs", path: "/meni", href: "/meni" },
          { locale: "en", path: "/menu", href: "/en/menu" },
        ],
      },
    ];
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/xml");
    const xml = await response.text();
    expect(xml).toContain("<loc>https://bricks.ba/meni</loc>");
    expect(xml).toContain('hreflang="en" href="https://bricks.ba/en/menu"');
  });

  it("is an empty urlset while indexing is off (the CMS lists nothing)", async () => {
    items = [];
    const { GET } = await import("./route");
    const xml = await (await GET()).text();
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});
