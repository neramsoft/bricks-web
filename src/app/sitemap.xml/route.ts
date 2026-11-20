import { getSitemap } from "@probiz/sdk";
import { cms } from "@/lib/api";
import { env } from "@/lib/env";
import { buildSitemapXml } from "@/lib/sitemap-xml";

// sitemap.xml from the CMS's public sitemap: published, indexable pages of every enabled language
// with their translations. Empty while indexing is off. Rebuilt by the `page.*`, `module.updated`
// and `seo.settings.updated` webhook events. This site has no blog, so nothing is added to the
// CMS's list. The handler runs on each request but the API answer comes from the data cache.
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getSitemap(cms());
  return new Response(buildSitemapXml(items, env().SITE_URL), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
