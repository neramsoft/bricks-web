import "server-only";
import { headers } from "next/headers";
import { getSiteData } from "@/lib/data";
import { requestedLocale } from "./locale";
import { getTable } from "./read";

/**
 * What the table page, its layout (the `lang` of `<html>`) and its 404 all need: the site, the
 * language asked for and the table. The proxy hands over the query string in `x-site-search`
 * (a layout cannot read it); `lang` may be given when the caller has it (the page does).
 */
export async function guestLocale(lang?: string | null) {
  const requestHeaders = await headers();
  const site = await getSiteData();
  const fromHeader = new URLSearchParams(requestHeaders.get("x-site-search") ?? "").get("lang");
  const asked = requestedLocale(
    lang ?? fromHeader,
    requestHeaders.get("accept-language"),
    site.languages.map((language) => language.code),
  );
  return { site, asked, requestHeaders };
}

/** The same, with the table the page is about. */
export async function tableRequest(token: string, lang?: string | null) {
  const { site, asked } = await guestLocale(lang);
  const result = await getTable(token, asked ?? "");
  const locale = result.kind === "ok" ? result.page.locale : (asked ?? site.defaultLocale);
  return { site, asked, locale, result };
}
