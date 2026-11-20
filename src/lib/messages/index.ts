import { bs } from "./bs";
import { en } from "./en";
import type { Messages } from "./types";

export type { Messages } from "./types";

const catalogs: Record<string, Messages> = { bs, en };

/** The chrome texts of a language. A language the CMS has but this site has no texts for gets English. */
export function messagesFor(locale: string): Messages {
  return catalogs[locale.toLowerCase().split("-")[0] ?? ""] ?? en;
}
