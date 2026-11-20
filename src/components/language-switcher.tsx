import type { PublicSite } from "@probiz/sdk";
import { localizedHref } from "@/lib/locale";

export interface SwitcherAlternate {
  locale: string;
  href: string;
}

/**
 * Where each other language leads: the translation of this page when there is one, otherwise the
 * language's home page.
 */
export function languageLinks(options: {
  languages: PublicSite["languages"];
  current: string;
  defaultLocale: string;
  alternates: readonly SwitcherAlternate[];
}) {
  const { languages, current, defaultLocale, alternates } = options;
  return languages
    .filter((language) => language.code !== current)
    .map((language) => {
      const translation = alternates.find((alternate) => alternate.locale === language.code);
      return {
        code: language.code,
        name: language.name,
        href: translation?.href ?? localizedHref(language.code, "/", defaultLocale),
        translated: Boolean(translation),
      };
    });
}

export function LanguageSwitcher({
  links,
  label,
  className,
}: {
  links: ReturnType<typeof languageLinks>;
  label: string;
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <ul className={className} aria-label={label}>
      {links.map((link) => (
        <li key={link.code}>
          <a href={link.href} hrefLang={link.code} lang={link.code} aria-label={link.name}>
            {link.code.toUpperCase()}
          </a>
        </li>
      ))}
    </ul>
  );
}
