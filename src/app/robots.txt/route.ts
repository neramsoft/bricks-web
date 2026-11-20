import { getRobots } from "@probiz/sdk";
import { cms } from "@/lib/api";

// robots.txt comes from the CMS: the fixed rules, the extra ones and the Sitemap line, or
// `Disallow: /` while indexing is switched off. The `seo.settings.updated` webhook expires the
// cached answer. The handler runs on each request but the API answer comes from the data cache
// (tagged, rebuilt by the webhook), so nothing here needs the API at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const text = await getRobots(cms());
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
