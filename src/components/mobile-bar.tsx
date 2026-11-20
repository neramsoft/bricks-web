import type { PublicMenuItem, PublicSite } from "@probiz/sdk";
import Link from "next/link";
import { dialable } from "@/lib/format";
import { splitHeaderMenu } from "@/lib/header-menu";
import type { Messages } from "@/lib/messages";

/**
 * The sticky bar of a phone: the header's two buttons (menu, reserve) and a call link to the
 * business phone. 56 px targets, the home indicator's inset below. Hidden on wider screens.
 */
export function MobileBar({
  site,
  messages,
  navigation,
}: {
  site: PublicSite;
  messages: Messages;
  navigation: readonly PublicMenuItem[];
}) {
  const { secondary, primary } = splitHeaderMenu(navigation);
  const phone = site.business.phone;
  if (!secondary && !primary && !phone) return null;
  const cell = (item: PublicMenuItem, className?: string) =>
    item.external ? (
      <a key={item.id} href={item.href} className={className}>
        {item.label}
      </a>
    ) : (
      <Link key={item.id} href={item.href} className={className}>
        {item.label}
      </Link>
    );
  return (
    <nav className="mbar" aria-label={messages.quickActions}>
      {secondary ? cell(secondary) : null}
      {primary ? cell(primary, "primary") : null}
      {phone ? <a href={`tel:${dialable(phone)}`}>{messages.call}</a> : null}
    </nav>
  );
}
