import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site-chrome";
import { describeFailure } from "@/forms/errors";
import { outcomeFromWord } from "@/forms/outcome";
import { cleanAnchor, cleanPagePath } from "@/forms/request";
import { getMenusData, getSiteData } from "@/lib/data";
import { messagesFor } from "@/lib/messages";

// Where a browser without JavaScript lands after posting a form (src/app/api/forms): the outcome
// is in the address, a few words and nothing private. Rendered per request, never cached, never
// indexed. The proxy leaves this prefix alone; a direct visit with no outcome is a 404.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const outcome = outcomeFromWord(first((await searchParams).s));
  const site = await getSiteData();
  const code = locale?.[0] ?? site.defaultLocale;
  const messages = messagesFor(code).form;
  return {
    title: outcome === "sent" ? messages.thanksTitle : messages.errorTitle,
    robots: { index: false, follow: true },
  };
}

export default async function FormResultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const outcome = outcomeFromWord(first(query.s));
  if (!outcome) notFound();
  const site = await getSiteData();
  const known = site.languages.find((language) => language.code.toLowerCase() === locale?.[0]);
  const code = known?.code ?? site.defaultLocale;
  const [localized, menus] = await Promise.all([getSiteData(code), getMenusData(code)]);
  const messages = messagesFor(code);
  const path = cleanPagePath(first(query.r)) ?? "/";
  const anchor = cleanAnchor(first(query.a));
  const sent = outcome === "sent";
  const lead = sent
    ? messages.form.thanksLead
    : outcome === "invalid"
      ? messages.form.invalid
      : describeFailure(outcome, messages.form);
  return (
    <SiteChrome site={localized} menus={menus} messages={messages} locale={code} alternates={[]}>
      <div className="status-page wrap">
        <h1 className="h-section">
          {sent ? messages.form.thanksHeading : messages.form.errorHeading}
        </h1>
        <p>{lead}</p>
        <Link className="btn" href={`${path}${anchor ? `#${anchor}` : ""}`}>
          {messages.form.back}
        </Link>
      </div>
    </SiteChrome>
  );
}
