import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localizedHref } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";
import { guestLocale } from "@/ordering/request";
import { MessagePage } from "@/ordering/views";

// "Ovaj QR kod ne važi." The proxy rewrites an unknown table code here with status 404 (src/proxy.ts),
// so the answer is a real 404 whose body is this page, drawn on the server. A direct visit (no
// `x-order-invalid`, which only the proxy sets) is nobody's address: a plain 404.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { site, asked } = await guestLocale();
  const name = site.business.name ?? site.business.legalName;
  const title = messagesFor(asked ?? site.defaultLocale).ordering.invalid.title;
  return { title: name ? `${title} | ${name}` : title, robots: { index: false, follow: true } };
}

export default async function InvalidCode() {
  const { site, asked, requestHeaders } = await guestLocale();
  if (!requestHeaders.get("x-order-invalid")) notFound();
  const locale = asked ?? site.defaultLocale;
  const text = messagesFor(locale).ordering.invalid;
  return (
    <MessagePage
      site={site}
      heading={text.heading}
      lead={text.lead}
      homeHref={localizedHref(locale, "/", site.defaultLocale)}
    />
  );
}
