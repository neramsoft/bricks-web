import type { OrderingItem, OrderingPage } from "./types";

// The guest's basket: pure, so the limits and the reconciliation after a reloaded menu are tested
// without a browser. Prices are never kept here: they are read from the page (whole cents) to
// show, and the API prices the order itself.

export const MAX_QTY = 20;
export const MAX_ROWS = 50;
export const MAX_NOTE = 300;

export interface CartLine {
  itemKey: string;
  /** The position of the price in the item's `prices`. */
  priceIndex: number;
  qty: number;
}

export type CartAction =
  | { type: "add"; itemKey: string; priceIndex: number }
  | { type: "remove"; itemKey: string; priceIndex: number }
  | { type: "clear" }
  | { type: "set"; lines: CartLine[] };

const same = (line: CartLine, itemKey: string, priceIndex: number) =>
  line.itemKey === itemKey && line.priceIndex === priceIndex;

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const found = lines.find((line) => same(line, action.itemKey, action.priceIndex));
      if (found) {
        if (found.qty >= MAX_QTY) return lines;
        return lines.map((line) => (line === found ? { ...line, qty: line.qty + 1 } : line));
      }
      if (lines.length >= MAX_ROWS) return lines;
      return [...lines, { itemKey: action.itemKey, priceIndex: action.priceIndex, qty: 1 }];
    }
    case "remove": {
      const found = lines.find((line) => same(line, action.itemKey, action.priceIndex));
      if (!found) return lines;
      if (found.qty <= 1) return lines.filter((line) => line !== found);
      return lines.map((line) => (line === found ? { ...line, qty: line.qty - 1 } : line));
    }
    case "clear":
      return [];
    case "set":
      return action.lines;
  }
}

export const qtyOf = (lines: readonly CartLine[], itemKey: string, priceIndex: number): number =>
  lines.find((line) => same(line, itemKey, priceIndex))?.qty ?? 0;

export const countOf = (lines: readonly CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.qty, 0);

/** Whether another row (not another unit of a row there already) would pass the 50-row limit. */
export const canAddRow = (lines: readonly CartLine[], itemKey: string, priceIndex: number) =>
  lines.some((line) => same(line, itemKey, priceIndex)) || lines.length < MAX_ROWS;

/** Every orderable item of the page by key. */
export function itemIndex(page: Pick<OrderingPage, "menus">): Map<string, OrderingItem> {
  const index = new Map<string, OrderingItem>();
  for (const menu of page.menus) {
    for (const section of menu.sections) {
      for (const item of section.items) if (!index.has(item.itemKey)) index.set(item.itemKey, item);
    }
  }
  return index;
}

/** The price of a line in cents from the page; null when the item or the price is gone. */
export function unitCents(items: Map<string, OrderingItem>, line: CartLine): number | null {
  return items.get(line.itemKey)?.prices[line.priceIndex]?.amount ?? null;
}

/** The total in cents, as the guest sees it (the API computes the real one). */
export function totalCents(lines: readonly CartLine[], items: Map<string, OrderingItem>): number {
  return lines.reduce((sum, line) => sum + (unitCents(items, line) ?? 0) * line.qty, 0);
}

/**
 * The basket against a menu that was read again: lines of items that no longer exist, cannot be
 * ordered, or whose price row is gone drop out; quantities are clamped. Returns the lines and how
 * many were dropped.
 */
export function reconcile(
  lines: readonly CartLine[],
  items: Map<string, OrderingItem>,
): { lines: CartLine[]; dropped: number } {
  const kept: CartLine[] = [];
  for (const line of lines) {
    const item = items.get(line.itemKey);
    const qty = Math.min(MAX_QTY, Math.floor(line.qty));
    if (!item || item.unavailable || !item.prices[line.priceIndex] || !(qty >= 1)) continue;
    if (kept.length >= MAX_ROWS) continue;
    kept.push({ ...line, qty });
  }
  return { lines: kept, dropped: lines.length - kept.length };
}

/** The body of the order: only keys, price positions and quantities. A single price is left out of `priceIndex`. */
export function orderBody(
  lines: readonly CartLine[],
  items: Map<string, OrderingItem>,
  note: string,
  locale: string,
) {
  const trimmed = note.trim().slice(0, MAX_NOTE);
  return {
    items: lines.map((line) => {
      const several = (items.get(line.itemKey)?.prices.length ?? 0) > 1;
      return {
        itemKey: line.itemKey,
        ...(several ? { priceIndex: line.priceIndex } : {}),
        qty: line.qty,
      };
    }),
    ...(trimmed ? { note: trimmed } : {}),
    locale,
  };
}

/** Parses a stored basket defensively: anything that is not a valid line is dropped. */
export function parseLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const lines: CartLine[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { itemKey, priceIndex, qty } = entry as Record<string, unknown>;
    if (
      typeof itemKey === "string" &&
      Number.isInteger(priceIndex) &&
      (priceIndex as number) >= 0 &&
      Number.isInteger(qty) &&
      (qty as number) >= 1
    ) {
      lines.push({
        itemKey,
        priceIndex: priceIndex as number,
        qty: Math.min(MAX_QTY, qty as number),
      });
    }
  }
  return lines.slice(0, MAX_ROWS);
}
