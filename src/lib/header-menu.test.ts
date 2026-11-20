import type { PublicMenuItem } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { splitHeaderMenu } from "./header-menu";

const item = (label: string): PublicMenuItem => ({
  id: label,
  label,
  href: `/${label}`,
  external: false,
  openInNewTab: false,
  children: [],
});

describe("splitHeaderMenu", () => {
  it("makes the last two items the buttons, the second the primary one", () => {
    const { links, secondary, primary } = splitHeaderMenu(
      ["a", "b", "c", "Meni", "Rezerviši"].map(item),
    );
    expect(links.map((i) => i.label)).toEqual(["a", "b", "c"]);
    expect(secondary?.label).toBe("Meni");
    expect(primary?.label).toBe("Rezerviši");
  });

  it("keeps a one-item menu as a link", () => {
    expect(splitHeaderMenu([item("a")])).toMatchObject({ secondary: null, primary: null });
    expect(splitHeaderMenu([])).toMatchObject({ links: [], primary: null });
  });
});
