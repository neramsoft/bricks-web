import { notFound } from "next/navigation";

// Where the proxy sends an address that is not a page, a redirect or anything else of the site
// (src/proxy.ts). It exists to answer 404 from a route that is rendered per request: the page
// route is cached (ISR), and a cached route can't report the visit with the visitor's browser
// and referrer. The address in the browser stays the one that was asked for.
export const dynamic = "force-dynamic";

export default function Missing() {
  notFound();
}
