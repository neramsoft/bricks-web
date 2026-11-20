import type { PublicSite } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { brandCss } from "./brand";

const brand = (primary: string) => ({ colors: { primary } }) as PublicSite["brand"];

describe("brandCss", () => {
  it("writes the primary colour as a variable", () => {
    expect(brandCss(brand("#0071ad"))).toBe(":root{--brand-primary:#0071ad}");
  });
  it("writes nothing it can't be sure is a colour", () => {
    expect(brandCss(brand("red;}body{display:none"))).toBe("");
    expect(brandCss(brand("#fff"))).toBe("");
    expect(brandCss(undefined)).toBe("");
  });
});
