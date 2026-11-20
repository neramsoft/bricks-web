import { describe, expect, it } from "vitest";
import {
  MAX_NOTE,
  MAX_QTY,
  MAX_ROWS,
  cartReducer,
  countOf,
  itemIndex,
  orderBody,
  parseLines,
  qtyOf,
  reconcile,
  totalCents,
  type CartLine,
} from "./cart";
import type { OrderingItem, OrderingPage } from "./types";

const item = (key: string, amounts: number[], unavailable = false): OrderingItem => ({
  itemKey: key,
  name: key,
  description: null,
  image: null,
  prices: amounts.map((amount, i) => ({ label: amounts.length > 1 ? `s${i}` : null, amount })),
  allergens: [],
  dietary: [],
  spicy: 0,
  recommended: false,
  unavailable,
});

const page = {
  menus: [
    {
      id: "m",
      title: "m",
      summary: null,
      sections: [
        {
          id: "s",
          title: "s",
          description: null,
          items: [item("a", [200]), item("b", [300, 450]), item("c", [100], true)],
        },
      ],
    },
  ],
} as Pick<OrderingPage, "menus">;
const items = itemIndex(page);

describe("cartReducer", () => {
  it("adds, counts per price row and removes down to nothing", () => {
    let lines: CartLine[] = [];
    lines = cartReducer(lines, { type: "add", itemKey: "a", priceIndex: 0 });
    lines = cartReducer(lines, { type: "add", itemKey: "a", priceIndex: 0 });
    lines = cartReducer(lines, { type: "add", itemKey: "b", priceIndex: 1 });
    expect(qtyOf(lines, "a", 0)).toBe(2);
    expect(qtyOf(lines, "b", 0)).toBe(0);
    expect(countOf(lines)).toBe(3);
    lines = cartReducer(lines, { type: "remove", itemKey: "a", priceIndex: 0 });
    lines = cartReducer(lines, { type: "remove", itemKey: "a", priceIndex: 0 });
    expect(lines).toEqual([{ itemKey: "b", priceIndex: 1, qty: 1 }]);
    expect(cartReducer(lines, { type: "remove", itemKey: "zzz", priceIndex: 0 })).toBe(lines);
  });

  it("stops at 20 of a row and at 50 rows", () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 25; i += 1)
      lines = cartReducer(lines, { type: "add", itemKey: "a", priceIndex: 0 });
    expect(qtyOf(lines, "a", 0)).toBe(MAX_QTY);
    lines = [];
    for (let i = 0; i < 60; i += 1)
      lines = cartReducer(lines, { type: "add", itemKey: `k${i}`, priceIndex: 0 });
    expect(lines).toHaveLength(MAX_ROWS);
    // A unit of a row that is there still goes in at the row limit.
    expect(qtyOf(cartReducer(lines, { type: "add", itemKey: "k0", priceIndex: 0 }), "k0", 0)).toBe(
      2,
    );
  });

  it("clears", () => {
    expect(cartReducer([{ itemKey: "a", priceIndex: 0, qty: 1 }], { type: "clear" })).toEqual([]);
  });
});

describe("totals and the order body", () => {
  const lines: CartLine[] = [
    { itemKey: "a", priceIndex: 0, qty: 2 },
    { itemKey: "b", priceIndex: 1, qty: 1 },
  ];

  it("totals in whole cents from the page's prices", () => {
    expect(totalCents(lines, items)).toBe(2 * 200 + 450);
  });

  it("sends keys, price positions (only for several prices), quantities, note and language", () => {
    expect(orderBody(lines, items, "  bez leda  ", "bs")).toEqual({
      items: [
        { itemKey: "a", qty: 2 },
        { itemKey: "b", priceIndex: 1, qty: 1 },
      ],
      note: "bez leda",
      locale: "bs",
    });
    // No prices anywhere in it.
    expect(JSON.stringify(orderBody(lines, items, "", "en"))).not.toMatch(/amount|price"|cents/i);
    expect(orderBody(lines, items, "   ", "en")).not.toHaveProperty("note");
    expect(orderBody(lines, items, "x".repeat(400), "en").note).toHaveLength(MAX_NOTE);
  });
});

describe("reconcile after the menu was read again", () => {
  it("drops items that are gone, unavailable or whose price row is gone, keeps the rest", () => {
    const result = reconcile(
      [
        { itemKey: "a", priceIndex: 0, qty: 3 },
        { itemKey: "gone", priceIndex: 0, qty: 1 },
        { itemKey: "c", priceIndex: 0, qty: 1 },
        { itemKey: "b", priceIndex: 5, qty: 1 },
        { itemKey: "b", priceIndex: 1, qty: 99 },
      ],
      items,
    );
    expect(result.lines).toEqual([
      { itemKey: "a", priceIndex: 0, qty: 3 },
      { itemKey: "b", priceIndex: 1, qty: MAX_QTY },
    ]);
    expect(result.dropped).toBe(3);
  });
});

describe("parseLines", () => {
  it("keeps valid lines of stored data and nothing else", () => {
    expect(parseLines("x")).toEqual([]);
    expect(
      parseLines([
        { itemKey: "a", priceIndex: 0, qty: 2 },
        { itemKey: 5, priceIndex: 0, qty: 2 },
        { itemKey: "a", priceIndex: -1, qty: 2 },
        { itemKey: "a", priceIndex: 0, qty: 0 },
        { itemKey: "a", priceIndex: 0, qty: 500 },
        null,
      ]),
    ).toEqual([
      { itemKey: "a", priceIndex: 0, qty: 2 },
      { itemKey: "a", priceIndex: 0, qty: MAX_QTY },
    ]);
  });
});
