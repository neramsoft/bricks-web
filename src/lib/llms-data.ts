import "server-only";
import { getEnabledModules, getMenus, getPage, getSitemap, getSite } from "@probiz/sdk";
import { cms } from "./api";
import { env } from "./env";
import { buildLlmsTxt, type LlmsLanguage } from "./llms-txt";

// The reads behind `/llms.txt`. All of them go through the cached, tagged client, so the CMS
// webhook that refreshes the sitemap, the menus and the pages refreshes this too, and a request
// costs no API call while the data is fresh.

/** Pages named in the file that no menu links to: a cap, so a large site stays a short file. */
const MAX_PAGES_PER_LANGUAGE = 40;

/** The file's text; null while the site is not to be indexed (the file is then not served). */
export async function llmsTxt(): Promise<string | null> {
  const siteUrl = env().SITE_URL;
  const site = await getSite(cms());
  if (!site.indexing) return null;
  const [modules, sitemap, languages] = await Promise.all([
    getEnabledModules(cms()).catch(() => null),
    getSitemap(cms()),
    Promise.all(
      site.languages.map(async (language): Promise<LlmsLanguage> => {
        const menus = await getMenus(cms(), language.code);
        return {
          locale: language.code,
          name: language.name,
          isDefault: language.isDefault,
          menus,
          pages: [],
        };
      }),
    ),
  ]);
  const withPages = await Promise.all(
    languages.map(async (language) => {
      const items = sitemap
        .filter((item) => item.type === "page" && item.locale === language.locale)
        .slice(0, MAX_PAGES_PER_LANGUAGE);
      const pages = await Promise.all(
        items.map(async (item) => {
          try {
            const page = await getPage(cms(), { locale: item.locale, path: item.path });
            const form = page.blocks.some((block) => block.type === "contactForm");
            return { href: item.href, title: page.title, form };
          } catch {
            return null;
          }
        }),
      );
      const found = pages.filter((page) => page !== null);
      return {
        language: { ...language, pages: found.map(({ href, title }) => ({ href, title })) },
        form: found.some((page) => page.form),
      };
    }),
  );
  return buildLlmsTxt({
    siteUrl,
    site,
    modules,
    hasForm: withPages.some((entry) => entry.form),
    languages: withPages.map((entry) => entry.language),
  });
}
