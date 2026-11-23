import { llmsTxt } from "@/lib/llms-data";

// llms.txt (https://llmstxt.org) from the CMS: the business, its hours and the important pages in
// every language. It is rebuilt from the cached CMS reads, which the revalidation webhook expires.
// With indexing off it is a plain 404 (nothing to recommend). When the CMS cannot be read, the
// last text this process built is served instead (briefly cached), and only a process that never
// built one answers 503, so a crawler never gets a page that looks like a file but is not.
export const dynamic = "force-dynamic";

const TEXT = "text/plain; charset=utf-8";
let lastGood: string | undefined;

export async function GET() {
  let text: string | null;
  try {
    text = await llmsTxt();
  } catch {
    if (lastGood === undefined) {
      return new Response("Temporarily unavailable\n", {
        status: 503,
        headers: { "Content-Type": TEXT, "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }
    return new Response(lastGood, {
      headers: { "Content-Type": TEXT, "Cache-Control": "public, max-age=0, s-maxage=60" },
    });
  }
  if (text === null) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": TEXT, "Cache-Control": "public, max-age=0, s-maxage=60" },
    });
  }
  lastGood = text;
  return new Response(text, {
    headers: {
      "Content-Type": TEXT,
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
