import type { PublicSitemapItem } from "@probiz/sdk";
import { absoluteUrl } from "./locale";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * `sitemap.xml` from the API's sitemap list (docs/decisions/0016 A3, 0022 S1, 0024 S2): one `url`
 * per item with its `lastmod`, the translations as `xhtml:link` alternates (only when there is
 * more than the page itself) and the images the CMS was asked to include.
 */
export function buildSitemapXml(items: readonly PublicSitemapItem[], siteUrl: string): string {
  const hasImages = items.some((item) => item.images.length > 0);
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"${
      hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""
    }>`,
  ];
  for (const item of items) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(absoluteUrl(siteUrl, item.href))}</loc>`);
    if (item.lastmod) lines.push(`    <lastmod>${escapeXml(item.lastmod)}</lastmod>`);
    if (item.alternates.length > 1) {
      for (const alternate of item.alternates) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.locale)}" href="${escapeXml(
            absoluteUrl(siteUrl, alternate.href),
          )}"/>`,
        );
      }
    }
    for (const image of item.images) {
      lines.push("    <image:image>");
      lines.push(`      <image:loc>${escapeXml(absoluteUrl(siteUrl, image.url))}</image:loc>`);
      if (image.alt) lines.push(`      <image:title>${escapeXml(image.alt)}</image:title>`);
      lines.push("    </image:image>");
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>", "");
  return lines.join("\n");
}
