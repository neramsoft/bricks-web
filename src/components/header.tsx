import Image from "next/image";
import Link from "next/link";
import type { PublicMenuItem, PublicSite } from "@probiz/sdk";
import { localizedHref } from "@/lib/locale";
import type { Messages } from "@/lib/messages";
import { LanguageSwitcher, languageLinks, type SwitcherAlternate } from "./language-switcher";
import { MenuList } from "./menu-list";

/** A placeholder header: the name or logo, the CMS's `header` menu and the language switcher. The design comes with the theme. */
export function Header({
  site,
  messages,
  locale,
  navigation,
  alternates,
}: {
  site: PublicSite;
  messages: Messages;
  locale: string;
  navigation: readonly PublicMenuItem[];
  alternates: readonly SwitcherAlternate[];
}) {
  const name = site.business.name ?? site.business.legalName ?? "";
  const logo = site.brand.logoLight;
  return (
    <header className="flex flex-wrap items-center gap-4 p-4">
      <Link
        href={localizedHref(locale, "/", site.defaultLocale)}
        aria-label={name || messages.home}
      >
        {logo ? (
          <Image
            src={logo.url}
            alt={name}
            width={logo.width}
            height={logo.height}
            sizes={`${logo.width}px`}
            className="h-10 w-auto"
            priority
          />
        ) : (
          name
        )}
      </Link>
      <nav aria-label={messages.mainNavigation}>
        <MenuList items={navigation} />
      </nav>
      <LanguageSwitcher
        label={messages.languageSwitcher}
        links={languageLinks({
          languages: site.languages,
          current: locale,
          defaultLocale: site.defaultLocale,
          alternates,
        })}
      />
    </header>
  );
}
