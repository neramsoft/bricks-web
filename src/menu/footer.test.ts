import type { PublicMenuItem } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { footerColumns } from "@/components/footer";

const item = (label: string, children: PublicMenuItem[] = []): PublicMenuItem => ({
  id: label,
  label,
  href: `/${label}`,
  external: false,
  openInNewTab: false,
  children,
});

describe("footerColumns", () => {
  it("makes a column of an item with children and groups the loose links four to a column", () => {
    const columns = footerColumns([
      item("a"),
      item("b"),
      item("c"),
      item("d"),
      item("e"),
      item("Kontakt", [item("x")]),
    ]);
    expect(columns.map((column) => [column.title, column.items.map((i) => i.label)])).toEqual([
      ["Kontakt", ["x"]],
      [null, ["a", "b", "c", "d"]],
      [null, ["e"]],
    ]);
  });
});
