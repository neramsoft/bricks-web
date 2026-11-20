import { describe, expect, it } from "vitest";
import { bs } from "@/lib/messages/bs";
import { en } from "@/lib/messages/en";
import { ALLERGEN_ORDER, allergenNumber, usedAllergens } from "./allergens";
import { availabilityText } from "./availability";
import { matches, fold } from "./search";
import { itemCountText, priceRows, searchText, type MenuItem } from "./view-model";

const item = (more: Partial<MenuItem> = {}): MenuItem => ({
  id: "1",
  name: "Heineken točeno",
  description: "S točionika.",
  image: null,
  prices: [
    { label: "0,25", amount: 300 },
    { label: "0,5", amount: 600 },
  ],
  allergens: ["gluten"],
  dietary: [],
  spicy: 0,
  recommended: false,
  unavailable: false,
  ...more,
});

describe("priceRows", () => {
  it("has a row per size with its label", () => {
    expect(priceRows(item(), "BAM", "bs")).toEqual([
      { label: "0,25", text: "3,00\u00a0KM" },
      { label: "0,5", text: "6,00\u00a0KM" },
    ]);
    expect(priceRows(item(), "BAM", "en").map((row) => row.text)).toEqual([
      "KM\u00a03.00",
      "KM\u00a06.00",
    ]);
  });
  it("has none while prices are hidden or the dish has none", () => {
    expect(priceRows(item(), null, "bs")).toEqual([]);
    expect(priceRows(item({ prices: [] }), "BAM", "bs")).toEqual([]);
  });
});

describe("itemCountText", () => {
  it("uses the plural form of the language", () => {
    expect(itemCountText(1, "bs", bs.menu)).toBe("1 stavka");
    expect(itemCountText(3, "bs", bs.menu)).toBe("3 stavke");
    expect(itemCountText(5, "bs", bs.menu)).toBe("5 stavki");
    expect(itemCountText(21, "bs", bs.menu)).toBe("21 stavka");
    expect(itemCountText(12, "bs", bs.menu)).toBe("12 stavki");
    expect(itemCountText(2, "en", en.menu)).toBe("2 items");
  });
});

describe("search", () => {
  it("folds accents and đ", () => {
    expect(fold("Žilavka Đurđevak")).toBe("zilavka djurdjevak");
  });
  it("finds a dish by name, description, size, label and allergen, without accents", () => {
    const text = searchText(item({ dietary: ["vegan"], recommended: true }), bs.menu);
    for (const query of [
      "heineken",
      "tocionik",
      "0,25",
      "veganski",
      "gluten",
      "preporuka",
      "toceno hein",
    ]) {
      expect(matches(text, query), query).toBe(true);
    }
    expect(matches(text, "kafa")).toBe(false);
    expect(matches(text, "")).toBe(true);
  });
});

describe("allergens", () => {
  it("numbers them as the legend does and lists only those used, in order", () => {
    expect(ALLERGEN_ORDER).toHaveLength(14);
    expect(allergenNumber("gluten")).toBe(1);
    expect(allergenNumber("milk")).toBe(7);
    expect(
      usedAllergens([item({ allergens: ["sulphites", "gluten"] }), item({ allergens: ["milk"] })]),
    ).toEqual(["gluten", "milk", "sulphites"]);
  });
});

describe("availabilityText", () => {
  const week = (days: string[]) => ({
    weekly: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map(
      (day) => ({
        day,
        open: days.includes(day),
        intervals: days.includes(day) ? [{ opens: "07:00", closes: "17:00" }] : [],
      }),
    ),
    exceptions: [],
  });
  it("says every day, weekdays and weekends in words", () => {
    const all = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    expect(availabilityText(week(all) as never, "bs", bs)).toBe("Dostupno svaki dan 07:00–17:00");
    expect(availabilityText(week(all.slice(0, 5)) as never, "bs", bs)).toBe(
      "Dostupno radnim danima 07:00–17:00",
    );
    expect(availabilityText(week(all.slice(5)) as never, "en", en)).toBe(
      "Available at weekends 07:00–17:00",
    );
    expect(availabilityText(week([]) as never, "bs", bs)).toBeNull();
    expect(availabilityText(null, "bs", bs)).toBeNull();
  });
});
