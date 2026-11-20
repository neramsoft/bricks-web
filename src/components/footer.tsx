import type { PublicMenu, PublicSite } from "@probiz/sdk";
import type { Messages } from "@/lib/messages";
import { primaryAddress } from "@/lib/jsonld";
import { MenuList } from "./menu-list";

/**
 * A placeholder footer: the business's contact details (the same ones the JSON-LD names), the
 * CMS's `footer` and `legal` menus and the rights line. The design comes with the theme.
 */
export function Footer({
  site,
  messages,
  footerMenu,
  legalMenu,
}: {
  site: PublicSite;
  messages: Messages;
  footerMenu: PublicMenu | undefined;
  legalMenu: PublicMenu | undefined;
}) {
  const { business } = site;
  const name = business.name ?? business.legalName;
  const address = primaryAddress(site);
  return (
    <footer className="p-4">
      <section aria-label={messages.contact}>
        {name ? <p>{name}</p> : null}
        {address ? (
          <address>
            {[address.street, [address.postalCode, address.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")}
          </address>
        ) : null}
        {business.phone ? (
          <p>
            <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}>{business.phone}</a>
          </p>
        ) : null}
        {business.email ? (
          <p>
            <a href={`mailto:${business.email}`}>{business.email}</a>
          </p>
        ) : null}
        {business.social.length > 0 ? (
          <ul className="flex list-none gap-3 p-0">
            {business.social.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noopener noreferrer">
                  {link.platform}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {footerMenu ? (
        <nav aria-label={messages.footerNavigation}>
          <MenuList items={footerMenu.items} />
        </nav>
      ) : null}
      {legalMenu ? (
        <nav aria-label={messages.legalNavigation}>
          <MenuList items={legalMenu.items} />
        </nav>
      ) : null}
      <p>
        © {new Date().getFullYear()} {name}. {messages.rights}
      </p>
    </footer>
  );
}
