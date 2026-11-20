import type { ReactNode } from "react";
import { findMenu, type PublicMenus, type PublicSite } from "@probiz/sdk";
import type { Messages } from "@/lib/messages";
import type { SwitcherAlternate } from "./language-switcher";
import { Footer } from "./footer";
import { Header } from "./header";

/**
 * Skip link, header, the main landmark and the footer, around a page. The navigation comes from
 * the CMS menus (`header`, `footer`, `legal`), the contact data from the business settings.
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
  return (
    <>
      <a href="#main" className="absolute left-4 top-[-80px] focus:top-4">
        {messages.skipToContent}
      </a>
      <Header
        site={site}
        messages={messages}
        locale={locale}
        navigation={findMenu(menus, "header")?.items ?? []}
        alternates={alternates}
      />
      <main id="main" tabIndex={-1} className="block p-4 outline-none">
        {children}
      </main>
      <Footer
        site={site}
        messages={messages}
        footerMenu={findMenu(menus, "footer")}
        legalMenu={findMenu(menus, "legal")}
      />
    </>
  );
}
