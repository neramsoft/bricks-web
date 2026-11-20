import { after } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { reportNotFound } from "@probiz/sdk";
import { NotFoundView } from "@/components/not-found-view";
import { cmsUncached } from "@/lib/api";
import { env } from "@/lib/env";

// The 404 page. The proxy sends every address that is not a page, a redirect or anything else of
// the site here (src/proxy.ts) with a rewrite whose status is 404, so the answer is a real 404
// whose body is this page, drawn on the server and present in the first HTML. Next's own
// `notFound()` is not used for this: its not-found file is drawn by the browser from the page's
// data when it sits in the segment of a root layout (the status is right, the HTML is empty), and
// the first HTML is what a crawler reads. The page is kept out of the index, and the CMS is told
// after the response has gone out. Next adds `noindex` to a 404 itself; the page names `noindex, follow` too (in `NotFoundView`), so a slow API never slows the visitor down.
export const dynamic = "force-dynamic";

export default async function Missing() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-site-path");
  // A direct visit to /missing is nobody's address: it is answered with Next's own 404.
  if (!pathname) notFound();

  const secret = env().REVALIDATE_SECRET;
  if (secret) {
    const report = {
      path: pathname,
      referrer: requestHeaders.get("referer"),
      userAgent: requestHeaders.get("user-agent"),
    };
    after(async () => {
      try {
        await reportNotFound(cmsUncached(), secret, report);
      } catch {
        // The log is a convenience: a failed report is not worth a visitor's attention.
      }
    });
  }
  return <NotFoundView pathname={pathname} />;
}
