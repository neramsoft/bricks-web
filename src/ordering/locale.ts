// Which language the table page speaks: `?lang=` when it names one the site has, else the best
// of the browser's Accept-Language among the site's languages, else the site's default (the API
// falls back to its default when `locale` is left out). The API then says what it used.

/** The language codes of an Accept-Language header, best first (by `q`, then by order). */
export function acceptedLanguages(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q=([\d.]+)\s*$/.exec(p)?.[1]).find((v) => v !== undefined);
      return { tag: tag.trim().toLowerCase(), q: q === undefined ? 1 : Number(q), index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}

const matches = (available: readonly string[], tag: string): string | undefined =>
  available.find((code) => code.toLowerCase() === tag) ??
  available.find((code) => code.toLowerCase() === tag.split("-")[0]);

/** The language to ask the API for, or undefined to leave it to the API's default. */
export function requestedLocale(
  lang: string | null | undefined,
  acceptLanguage: string | null | undefined,
  available: readonly string[],
): string | undefined {
  const asked = lang?.trim().toLowerCase();
  if (asked) {
    const found = matches(available, asked);
    if (found) return found;
  }
  for (const tag of acceptedLanguages(acceptLanguage)) {
    const found = matches(available, tag);
    if (found) return found;
  }
  return undefined;
}
