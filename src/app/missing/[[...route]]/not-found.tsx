import Link from "next/link";
import { after } from "next/server";
import { headers } from "next/headers";
import { reportNotFound } from "@probiz/sdk";
import { SiteChrome } from "@/components/site-chrome";
import { cmsUncached } from "@/lib/api";
import { getMenusData, getRouteContext, getSiteData } from "@/lib/data";
import { env } from "@/lib/env";
import { localizedHref } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";

// The 404 page. The status is 404 (notFound() in page.tsx), the page is kept out of the index, and
// the CMS is told after the response has gone out, so a slow API never slows the visitor down.
export default async function NotFound() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-site-path") ?? "/";
  const context = await getRouteContext(pathname.split("/").filter(Boolean).join("/"));
  const locale = context.route?.locale ?? context.defaultLocale;
  const [site, menus] = await Promise.all([getSiteData(locale), getMenusData(locale)]);
  const messages = messagesFor(locale);

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

  const name = site.business.name ?? site.business.legalName;
  return (
    <>
      <title>{name ? `${messages.notFound.title} | ${name}` : messages.notFound.title}</title>
      <SiteChrome site={site} menus={menus} messages={messages} locale={locale} alternates={[]}>
        <h1>{messages.notFound.heading}</h1>
        <p>{messages.notFound.lead}</p>
        <p>
          <Link href={localizedHref(locale, "/", context.defaultLocale)}>
            {messages.notFound.home}
          </Link>
        </p>
      </SiteChrome>
    </>
  );
}
