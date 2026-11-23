import type { PublicMenu, PublicMenuItem, PublicSite } from "@probiz/sdk";
import Link from "next/link";
import { dialable, validTimeZone } from "@/lib/format";
import { todayHoursText } from "@/lib/hours-summary";
import { primaryAddress } from "@/lib/jsonld";
import type { Messages } from "@/lib/messages";

function ItemLink({ item }: { item: PublicMenuItem }) {
  return item.external ? (
    <a
      href={item.href}
      {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {item.label}
    </a>
  ) : (
    <Link href={item.href} {...(item.openInNewTab ? { target: "_blank" } : {})}>
      {item.label}
    </Link>
  );
}

interface Column {
  key: string;
  title: string | null;
  items: readonly PublicMenuItem[];
}

/**
 * The footer menu's columns. An item with children is a column (its label the title, its children
 * the links); items without children are the plain links, four to a column.
 */
export function footerColumns(items: readonly PublicMenuItem[]): Column[] {
  const columns: Column[] = [];
  const loose: PublicMenuItem[] = [];
  for (const item of items) {
    if (item.children.length > 0) {
      columns.push({ key: item.id, title: item.label, items: item.children });
    } else loose.push(item);
  }
  for (let index = 0; index < loose.length; index += 4) {
    const chunk = loose.slice(index, index + 4);
    columns.push({ key: chunk[0]!.id, title: null, items: chunk });
  }
  return columns;
}

/**
 * The footer: the name built from six bricks, the CMS's `footer` menu as columns, the business's
 * contact details (the same ones the JSON-LD names) and today's hours, then the `legal` menu.
 */
export function Footer({
  site,
  messages,
  locale,
  footerMenu,
  legalMenu,
}: {
  site: PublicSite;
  messages: Messages;
  locale: string;
  footerMenu: PublicMenu | undefined;
  legalMenu: PublicMenu | undefined;
}) {
  void locale;
  const { business } = site;
  const name = business.name ?? business.legalName;
  const address = primaryAddress(site);
  const hours = todayHoursText(
    business.openingHours,
    new Date(),
    validTimeZone(business.timeZone),
    messages,
  );
  const letters = (name ?? "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 8)
    .toUpperCase()
    .split("");
  const point =
    address?.latitude != null && address.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`
      : null;
  const columns = footerColumns(footerMenu?.items ?? []);
  return (
    <footer className="site-footer wrap">
      {letters.length > 0 ? (
        <div className="footer-blocks" role="img" aria-label={name ?? undefined}>
          {letters.map((letter, index) => (
            <span key={index} aria-hidden="true">
              {letter}
            </span>
          ))}
        </div>
      ) : null}
      <div className="footer-grid">
        {columns.map((column) => (
          <nav
            key={column.key}
            className="footer-col"
            aria-label={column.title ?? messages.footerNavigation}
          >
            {column.title ? <h2>{column.title}</h2> : null}
            {column.items.map((item) => (
              <ItemLink key={item.id} item={item} />
            ))}
          </nav>
        ))}
        <div className="footer-contact">
          {business.email ? <a href={`mailto:${business.email}`}>{business.email}</a> : null}
          {business.phone ? <a href={`tel:${dialable(business.phone)}`}>{business.phone}</a> : null}
          {point ? (
            <a href={point} target="_blank" rel="noopener noreferrer">
              {messages.navigate}
            </a>
          ) : null}
          {business.social.map((link) => (
            <a key={link.url} href={link.url} rel="noopener noreferrer me" target="_blank">
              {link.platform.charAt(0) + link.platform.slice(1).toLowerCase()}
            </a>
          ))}
        </div>
        {name || address ? (
          <address className="footer-address">
            {name ? <b>{name}</b> : null}
            {address?.street ? (
              <>
                <br />
                {[address.street, address.city].filter(Boolean).join(", ")}
              </>
            ) : null}
            {hours ? <span className="hours-today">{hours}</span> : null}
          </address>
        ) : null}
      </div>
      <div className="footer-last">
        {/* The copyright and the legal links read as one line on the left; "back to top" is on the right. */}
        <div className="footer-legal">
          <span>
            © {new Date().getFullYear()} {name}. {messages.rights}{" "}
            <a href="https://skymedia-agency.com" target="_blank" rel="noopener">
              {messages.poweredBy}
            </a>
          </span>
          {legalMenu ? (
            <nav aria-label={messages.legalNavigation}>
              <ul className="footer-legal-links">
                {legalMenu.items.map((item) => (
                  <li key={item.id}>
                    <ItemLink item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
        <a className="btn sm quiet" href="#top">
          {messages.top}
        </a>
      </div>
    </footer>
  );
}
