import Image from "next/image";
import Link from "next/link";
import type { PublicMenuItem, PublicSite } from "@probiz/sdk";
import { splitHeaderMenu } from "@/lib/header-menu";
import { localizedHref } from "@/lib/locale";
import type { Messages } from "@/lib/messages";
import { LanguageSwitcher, languageLinks, type SwitcherAlternate } from "./language-switcher";

function ItemLink({ item, className }: { item: PublicMenuItem; className?: string }) {
  if (item.external) {
    return (
      <a
        href={item.href}
        className={className}
        {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link
      href={item.href}
      className={className}
      {...(item.openInNewTab ? { target: "_blank" } : {})}
    >
      {item.label}
    </Link>
  );
}

/**
 * The sticky header: the logo (the CMS brand's, or the wordmark until it has one), the CMS's
 * `header` menu with its last two items as buttons, and the language switcher. On a narrow screen
 * the links fold behind a burger that works without script (a checkbox).
 */
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
  const logo = site.brand.logoDark ?? site.brand.logoLight;
  const { links, secondary, primary } = splitHeaderMenu(navigation);
  return (
    <header className="site-header wrap">
      <div className="nav">
        <Link
          className="nav-logo"
          href={localizedHref(locale, "/", site.defaultLocale)}
          aria-label={name || messages.home}
        >
          {logo ? (
            <Image
              src={logo.url}
              alt=""
              width={logo.width}
              height={logo.height}
              sizes="160px"
              unoptimized={logo.mimeType === "image/svg+xml"}
              priority
              style={{ height: 44, width: "auto" }}
            />
          ) : (
            <Image
              src="/brand/bricks-wordmark-white.png"
              alt=""
              width={498}
              height={171}
              sizes="130px"
              priority
              style={{ height: 44, width: "auto" }}
            />
          )}
        </Link>
        <input
          type="checkbox"
          id="nav-toggle"
          className="nav-toggle"
          aria-label={messages.menuToggle}
        />
        <label htmlFor="nav-toggle" className="nav-burger" aria-hidden="true">
          <span />
        </label>
        <div className="nav-right">
          <nav aria-label={messages.mainNavigation}>
            <ul className="nav-links">
              {links.map((item) => (
                <li key={item.id}>
                  <ItemLink item={item} />
                </li>
              ))}
            </ul>
          </nav>
          {secondary || primary ? (
            <div className="nav-buttons">
              {secondary ? <ItemLink item={secondary} className="btn quiet" /> : null}
              {primary ? <ItemLink item={primary} className="btn" /> : null}
            </div>
          ) : null}
          <LanguageSwitcher
            className="lang"
            label={messages.languageSwitcher}
            links={languageLinks({
              languages: site.languages,
              current: locale,
              defaultLocale: site.defaultLocale,
              alternates,
            })}
          />
        </div>
      </div>
    </header>
  );
}
