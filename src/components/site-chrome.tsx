import type { ReactNode } from "react";
import { findMenu, type PublicMenus, type PublicSite } from "@probiz/sdk";
import type { Messages } from "@/lib/messages";
import type { SwitcherAlternate } from "./language-switcher";
import { Footer } from "./footer";
import { Header } from "./header";
import { MobileBar } from "./mobile-bar";
import { Reveal } from "./reveal";

/**
 * Skip link, header, the main landmark, the footer and the phone bar, around a page. The
 * navigation comes from the CMS menus (`header`, `footer`, `legal`), the contact data from the
 * business settings.
 */
export function SiteChrome({
  site,
  menus,
  messages,
  locale,
  alternates,
  children,
}: {
  site: PublicSite;
  menus: PublicMenus;
  messages: Messages;
  locale: string;
  alternates: readonly SwitcherAlternate[];
  children: ReactNode;
}) {
  const navigation = findMenu(menus, "header")?.items ?? [];
  return (
    <>
      <a href="#main" className="skip-link">
        {messages.skipToContent}
      </a>
      <Header
        site={site}
        messages={messages}
        locale={locale}
        navigation={navigation}
        alternates={alternates}
      />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
        <span id="top" />
        {children}
      </main>
      <Footer
        site={site}
        messages={messages}
        locale={locale}
        footerMenu={findMenu(menus, "footer")}
        legalMenu={findMenu(menus, "legal")}
      />
      <MobileBar site={site} messages={messages} navigation={navigation} />
      <Reveal />
    </>
  );
}
