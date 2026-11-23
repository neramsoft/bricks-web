import type { PublicMenuItem, PublicMenus, PublicSite } from "@probiz/sdk";
import { fill, weekdayName, WEEKDAYS } from "./format";
import { primaryAddress } from "./jsonld";
import { absoluteUrl } from "./locale";
import { messagesFor, type Messages } from "./messages";

// `llms.txt` (https://llmstxt.org): a Markdown summary of the site for language models, built
// from what the CMS says (the business settings, the public menus, the page list). The shape is
// fixed by the spec: an H1 with the name, a blockquote summary, free text, then H2 sections that
// hold lists of links. Nothing here is Bricks-specific: the sentences come from the message
// catalogue and the links from the CMS.

type Hours = PublicSite["business"]["openingHours"];

export interface LlmsLanguage {
  locale: string;
  /** The language's own name ("Bosanski"). */
  name: string;
  isDefault: boolean;
  menus: PublicMenus;
  /** The public pages of this language that no menu names: address with its prefix, and title. */
  pages: readonly { href: string; title: string }[];
}

export interface LlmsInput {
  siteUrl: string;
  /** The site's settings in the default language. */
  site: PublicSite;
  /** Keys of the switched-on optional modules; null when the API could not say. */
  modules: readonly string[] | null;
  languages: readonly LlmsLanguage[];
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** Link text: no line breaks, and no brackets that would end the link early. */
const linkText = (value: string) => oneLine(value).replace(/[[\]]/g, "");

/**
 * The week in words, days with the same hours together: "ponedjeljak–petak 07:00–23:00;
 * subota–nedjelja 09:00–23:00". A day without hours is "closed". Null without a week.
 */
export function hoursInWords(hours: Hours, locale: string, messages: Messages): string | null {
  const byDay = new Map(hours.weekly.map((entry) => [entry.day, entry]));
  const days = WEEKDAYS.flatMap((day) => {
    const entry = byDay.get(day);
    if (!entry) return [];
    const open = entry.open && entry.intervals.length > 0;
    const text = open
      ? entry.intervals
          .map((i) => fill(messages.blocks.opensCloses, { from: i.opens, to: i.closes }))
          .join(", ")
      : messages.llms.closedDay;
    return [{ day, text }];
  });
  if (days.length === 0) return null;
  const groups: { days: typeof WEEKDAYS; text: string }[] = [];
  for (const entry of days) {
    const last = groups[groups.length - 1];
    if (last && last.text === entry.text) last.days.push(entry.day);
    else groups.push({ days: [entry.day], text: entry.text });
  }
  return groups
    .map((group) => {
      const first = weekdayName(group.days[0]!, locale);
      const last = weekdayName(group.days[group.days.length - 1]!, locale);
      const names =
        group.days.length === 1
          ? first
          : group.days.length === 2
            ? `${first}, ${last}`
            : `${first}–${last}`;
      return `${names} ${group.text}`;
    })
    .join("; ");
}

/** What a visitor can do here, from the modules that are on, as a list in the language. */
function abilities(modules: readonly string[] | null, locale: string, messages: Messages) {
  if (!modules) return null;
  const can = [
    modules.includes("menu") ? messages.llms.canMenu : null,
    modules.includes("forms") ? messages.llms.canReserve : null,
    modules.includes("ordering") ? messages.llms.canOrder : null,
  ].filter((entry): entry is string => entry !== null);
  if (can.length === 0) return null;
  let list: string;
  try {
    list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(can);
  } catch {
    list = can.join(", ");
  }
  return fill(messages.llms.can, { list });
}

/** Every internal link of the menus, children included, in menu order. */
function menuLinks(items: readonly PublicMenuItem[]): PublicMenuItem[] {
  return items.flatMap((item) => [
    ...(item.external ? [] : [item]),
    ...menuLinks(item.children ?? []),
  ]);
}

function languageLinks(language: LlmsLanguage, siteUrl: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  const add = (label: string, href: string) => {
    const text = linkText(label);
    if (!text || !href.startsWith("/") || seen.has(href)) return;
    seen.add(href);
    lines.push(`- [${text}](${absoluteUrl(siteUrl, href)})`);
  };
  // The home page first, then the menus' links (the sections of the home page are anchors there),
  // then the other pages no menu names.
  const home = language.isDefault ? "/" : `/${language.locale}`;
  for (const page of language.pages) if (page.href === home) add(page.title, page.href);
  for (const menu of language.menus.menus) {
    for (const item of menuLinks(menu.items)) add(item.label, item.href);
  }
  for (const page of language.pages) add(page.title, page.href);
  return lines;
}

/** The text of `/llms.txt`: Markdown, an H1, a summary, a paragraph, and sections of links. */
export function buildLlmsTxt(input: LlmsInput): string {
  const { site, siteUrl, languages } = input;
  const locale = languages.find((l) => l.isDefault)?.locale ?? site.defaultLocale;
  const messages = messagesFor(locale);
  const business = site.business;
  const name = linkText(business.name ?? new URL(siteUrl).hostname);

  const out: string[] = [`# ${name}`, ""];
  const description = business.description ? oneLine(business.description) : "";
  if (description) out.push(`> ${description}`, "");

  const address = primaryAddress(site);
  const where = address
    ? [address.street, [address.postalCode, address.city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
    : "";
  const hours = hoursInWords(business.openingHours, locale, messages);
  const paragraph = [
    where ? fill(messages.llms.address, { address: where }) : null,
    hours ? fill(messages.llms.hours, { hours }) : null,
    abilities(input.modules, locale, messages),
  ].filter((entry): entry is string => entry !== null);
  if (paragraph.length > 0) out.push(paragraph.join(" "), "");

  for (const language of languages) {
    const links = languageLinks(language, siteUrl);
    if (links.length === 0) continue;
    out.push(`## ${linkText(language.name)}`, "", ...links, "");
  }

  // "Optional" is the spec's name for links a reader may skip.
  out.push(
    "## Optional",
    "",
    `- [${messages.llms.sitemap}](${absoluteUrl(siteUrl, "/sitemap.xml")})`,
    "",
  );
  return out.join("\n");
}
