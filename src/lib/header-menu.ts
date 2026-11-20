import type { PublicMenuItem } from "@probiz/sdk";

/**
 * The header menu is the site's links, and its last two items are its two buttons ("Meni" quiet,
 * "Rezerviši sto" in the brick colour), the way the prototype draws it.
 *
 * The prototype's spec asks for the second item "of type button" to be the brick primary, but the
 * public menu answer has no item type (the CMS's items are `page`, `url` or `post`), so the rule
 * is positional until the CMS can mark an item as a button (docs/decisions/0002).
 */
export function splitHeaderMenu(items: readonly PublicMenuItem[]): {
  links: readonly PublicMenuItem[];
  secondary: PublicMenuItem | null;
  primary: PublicMenuItem | null;
} {
  if (items.length < 2) return { links: items, secondary: null, primary: null };
  return {
    links: items.slice(0, -2),
    secondary: items.length >= 2 ? items[items.length - 2]! : null,
    primary: items[items.length - 1]!,
  };
}
