import type { PublicSitemapItem } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "./sitemap-xml";

const item = (partial: Partial<PublicSitemapItem>): PublicSitemapItem => ({
  type: "page",
  locale: "bs",
  path: "/",
  href: "/",
  lastmod: "2026-11-10T10:00:00.000Z",
  alternates: [],
  images: [],
  ...partial,
});

describe("buildSitemapXml", () => {
  it("lists absolute addresses with their last change", () => {
    const xml = buildSitemapXml([item({ href: "/meni" })], "https://bricks.ba");
    expect(xml).toContain("<loc>https://bricks.ba/meni</loc>");
    expect(xml).toContain("<lastmod>2026-11-10T10:00:00.000Z</lastmod>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).not.toContain("xhtml:link");
    expect(xml).not.toContain("image:image");
  });

  it("adds the translations as alternates when there is more than one", () => {
    const xml = buildSitemapXml(
      [
        item({
          href: "/meni",
          alternates: [
            { locale: "bs", path: "/meni", href: "/meni" },
            { locale: "en", path: "/services", href: "/en/services" },
          ],
        }),
      ],
      "https://x.test",
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://x.test/en/services"/>',
    );
    expect(xml).toContain('hreflang="bs" href="https://x.test/meni"');
  });

  it("skips alternates that only list the page itself", () => {
    const xml = buildSitemapXml(
      [item({ alternates: [{ locale: "bs", path: "/", href: "/" }] })],
      "https://x.test",
    );
    expect(xml).not.toContain("xhtml:link");
  });

  it("adds images when the CMS includes them and escapes everything", () => {
    const xml = buildSitemapXml(
      [
        item({
          href: "/a&b",
          images: [{ url: "https://cdn.test/a.png?x=1&y=2", alt: 'Say "hi" <b>' }],
        }),
      ],
      "https://x.test",
    );
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain("<loc>https://x.test/a&amp;b</loc>");
    expect(xml).toContain("<image:loc>https://cdn.test/a.png?x=1&amp;y=2</image:loc>");
    expect(xml).toContain("<image:title>Say &quot;hi&quot; &lt;b&gt;</image:title>");
  });

  it("is a valid empty urlset while indexing is off", () => {
    const xml = buildSitemapXml([], "https://x.test");
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});
