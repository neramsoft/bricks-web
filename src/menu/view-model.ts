import type { ApiComponents } from "@probiz/sdk";
import { fill, formatMoney } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import { fold } from "./search";

type Schemas = ApiComponents["schemas"];
export type MenuItem = Schemas["PublicRestaurantMenuItem"];
export type MenuSection = Schemas["PublicRestaurantMenuSection"];

/** "3 stavke": the count of a section, in the language's plural form. */
export function itemCountText(count: number, locale: string, messages: Messages["menu"]): string {
  const form = new Intl.PluralRules(locale).select(count);
  const template =
    form === "one" ? messages.itemsOne : form === "few" ? messages.itemsFew : messages.itemsMany;
  return fill(template, { n: count });
}

export interface PriceRow {
  /** The size or portion ("0,25"), when the dish has several prices. */
  label: string | null;
  /** The amount as money: "2,50 KM". */
  text: string;
}

/**
 * The price rows of a dish. While prices are hidden (`currency` is null) or the dish has none,
 * there are no rows. A row has its label so "0,25 l" and "0,5 l" can be told apart.
 */
export function priceRows(item: MenuItem, currency: string | null, locale: string): PriceRow[] {
  if (!currency) return [];
  return item.prices.map((price) => ({
    label: price.label,
    text: formatMoney(price.amount, currency, locale),
  }));
}

/** The words a dish can be found by: name, description, price labels, dietary and allergen names. */
export function searchText(item: MenuItem, messages: Messages["menu"]): string {
  return fold(
    [
      item.name,
      item.description ?? "",
      ...item.prices.flatMap((price) => (price.label ? [price.label] : [])),
      ...item.dietary.map((key) => messages.dietary[key]),
      ...item.allergens.map((key) => messages.allergenNames[key]),
      item.recommended ? messages.recommended : "",
    ].join(" "),
  );
}

/** The dietary marks in a list of items, once each, in the order the API lists them. */
export function usedDietary(items: ReadonlyArray<Pick<MenuItem, "dietary">>) {
  const order = ["vegan", "vegetarian", "gluten_free", "lactose_free", "halal"] as const;
  const used = new Set(items.flatMap((item) => item.dietary));
  return order.filter((key) => used.has(key));
}
