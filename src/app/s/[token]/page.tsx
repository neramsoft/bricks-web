import type { Metadata } from "next";
import { env } from "@/lib/env";
import { fill } from "@/lib/format";
import { localizedHref } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";
import { intervalsText } from "@/blocks/components/hours";
import { OrderApp } from "@/ordering/order-app";
import { tableRequest } from "@/ordering/request";
import { MessagePage, orderLogo } from "@/ordering/views";

// The guest's page of a table, `/s/<token>` (docs/decisions/0001 F5, 0003). The route is fixed: the
// CMS prints `{websiteUrl}/s/{token}` on the table's QR code. Read on the server for every visit,
// never cached, never indexed, not in the sitemap. The basket is a client island that takes the
// page's data as props; the menu is in the first HTML.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { token } = await params;
  const { site, locale, result } = await tableRequest(token, first((await searchParams).lang));
  const text = messagesFor(locale).ordering;
  const robots = { index: false, follow: true };
  const name = site.business.name ?? site.business.legalName;
  const suffix = name ? ` | ${name}` : "";
  if (result.kind === "ok") {
    return {
      title: `${fill(text.pageTitle, { number: result.page.table.number })}${suffix}`,
      robots,
    };
  }
  const message =
    result.kind === "disabled" ? text.disabled : result.kind === "busy" ? text.busy : text.invalid;
  return { title: `${message.title}${suffix}`, robots };
}

export default async function TablePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { site, locale, result } = await tableRequest(token, first((await searchParams).lang));

  const messages = messagesFor(locale);
  const homeHref = localizedHref(locale, "/", site.defaultLocale);
  if (result.kind !== "ok") {
    // `not_found` is answered by the proxy with a 404 (src/proxy.ts); it reaches here only when the
    // table went away between the proxy's check and this read, and then the page is the same text.
    const text =
      result.kind === "disabled"
        ? messages.ordering.disabled
        : result.kind === "busy"
          ? messages.ordering.busy
          : messages.ordering.invalid;
    return <MessagePage site={site} heading={text.heading} lead={text.lead} homeHref={homeHref} />;
  }

  const { page } = result;
  const text = messagesFor(page.locale);
  const today = page.venue.todayHours;
  const hours =
    today && !today.closed && today.intervals.length > 0
      ? fill(text.blocks.todayHours, { hours: intervalsText(today.intervals, text) })
      : today
        ? text.blocks.todayClosed
        : null;
  const status = page.venue.openNow ? text.blocks.openNow : text.blocks.closedNow;
  const languages = page.languages
    .filter((code) => code !== page.locale)
    .map((code) => ({
      code,
      name: site.languages.find((language) => language.code === code)?.name ?? code,
      href: `/s/${encodeURIComponent(token)}?lang=${encodeURIComponent(code)}`,
    }));

  return (
    <OrderApp
      page={page}
      token={token}
      publicApiUrl={env().PUBLIC_API_URL}
      messages={text.ordering}
      venueLine={[status, hours].filter(Boolean).join(" · ")}
      languages={languages}
      logo={orderLogo(site)}
      homeHref={localizedHref(page.locale, "/", site.defaultLocale)}
    />
  );
}
