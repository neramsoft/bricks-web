import { NextResponse, type NextRequest } from "next/server";
import { goneHtml } from "@/lib/gone-page";
import { localizedHref, splitPathname } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";
import { classify, localeSet } from "@/lib/proxy-decision";

// The proxy answers what a cached page render can't: a CMS redirect (301, 302), a gone address
// (410) and a missing one (a real 404 from /missing, which reports the visit to the CMS's 404
// log). A live address goes on to the cached catch-all page. The API not answering lets the
// request through unchanged.

const CACHE_SHORT = "public, max-age=0, s-maxage=60";

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // The 404 page reads the address from here: a rewrite hides it from `headers()` otherwise.
  headers.set("x-site-path", request.nextUrl.pathname);
  const pass = () => NextResponse.next({ request: { headers } });
  if (request.method !== "GET" && request.method !== "HEAD") return pass();

  try {
    const verdict = await classify(request.nextUrl);
    if (verdict.kind === "redirect") {
      const response = NextResponse.redirect(verdict.location, verdict.status);
      response.headers.set("Cache-Control", CACHE_SHORT);
      return response;
    }
    if (verdict.kind === "gone") {
      const set = await localeSet();
      const locale = splitPathname(request.nextUrl.pathname, set)?.locale ?? set.defaultLocale;
      const messages = messagesFor(locale);
      return new NextResponse(
        goneHtml({
          locale,
          messages: messages.gone,
          homeLabel: messages.notFound.home,
          homeHref: localizedHref(locale, "/", set.defaultLocale),
        }),
        {
          status: 410,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, follow",
            "Cache-Control": CACHE_SHORT,
          },
        },
      );
    }
    if (verdict.kind === "missing") {
      // The address in the browser stays the one that was asked for.
      const target = new URL(`/missing${request.nextUrl.pathname}`, request.url);
      target.search = request.nextUrl.search;
      return NextResponse.rewrite(target, { request: { headers } });
    }
  } catch {
    // The API did not answer in time: show the page as it is rather than hold every visitor up.
  }
  return pass();
}

export const config = {
  // Pages only: not Next's own files, the API routes, the preview, robots.txt, sitemap.xml and
  // anything with a file extension. Add a route outside the catch-all here (and to
  // lib/reserved-paths.ts).
  matcher: [
    "/((?!_next/|api/|preview/|preview$|missing/|missing$|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
