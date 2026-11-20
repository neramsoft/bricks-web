import type { ApiComponents } from "@probiz/sdk";

type Schemas = ApiComponents["schemas"];
export type MenuAllergen = Schemas["MenuAllergen"];
export type MenuDietary = Schemas["MenuDietary"];

/**
 * The 14 allergens of EU Regulation 1169/2011 in the order of the legend: the number of an
 * allergen on the page is its place in this list, from 1. The type below fails to compile when
 * the API gains a key this list does not have.
 */
export const ALLERGEN_ORDER = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const satisfies readonly MenuAllergen[];

type Missing = Exclude<MenuAllergen, (typeof ALLERGEN_ORDER)[number]>;
export const ALLERGENS_ARE_COMPLETE: [Missing] extends [never] ? true : never = true;

/** The number of an allergen in the legend (1 to 14). */
export const allergenNumber = (key: MenuAllergen): number => ALLERGEN_ORDER.indexOf(key) + 1;

/** The allergens in a list of items, once each, in the order of their numbers. */
export function usedAllergens(
  items: ReadonlyArray<{ allergens: readonly MenuAllergen[] }>,
): MenuAllergen[] {
  const used = new Set(items.flatMap((item) => item.allergens));
  return ALLERGEN_ORDER.filter((key) => used.has(key));
}
