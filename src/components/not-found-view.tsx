import Link from "next/link";
import { SiteChrome } from "@/components/site-chrome";
import { getMenusData, getRouteContext, getSiteData } from "@/lib/data";
import { localizedHref } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";

/** What `/missing` and its metadata both need: the language of the address that was asked for. */
export async function missingContext(pathname: string) {
  const context = await getRouteContext(pathname.split("/").filter(Boolean).join("/"));
  const locale = context.route?.locale ?? context.defaultLocale;
  return { context, locale, messages: messagesFor(locale) };
}

/** The 404 page's content, in the site's chrome and the visitor's language. Server-rendered. */
export async function NotFoundView({ pathname }: { pathname: string }) {
  const { context, locale, messages } = await missingContext(pathname);
  const [site, menus] = await Promise.all([getSiteData(locale), getMenusData(locale)]);
  const name = site.business.name ?? site.business.legalName;
  return (
    <>
      <title>{name ? `${messages.notFound.title} | ${name}` : messages.notFound.title}</title>
      <meta name="robots" content="noindex, follow" />
      <SiteChrome site={site} menus={menus} messages={messages} locale={locale} alternates={[]}>
        <div className="status-page wrap">
          <h1 className="h-display">{messages.notFound.heading}</h1>
          <p>{messages.notFound.lead}</p>
          <Link className="btn" href={localizedHref(locale, "/", context.defaultLocale)}>
            {messages.notFound.home}
          </Link>
        </div>
      </SiteChrome>
    </>
  );
}
