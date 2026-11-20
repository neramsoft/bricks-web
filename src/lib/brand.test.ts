import type { PublicSite } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { brandCss } from "./brand";

const brand = (primary: string, accent = "") =>
  ({ colors: { primary, accent } }) as PublicSite["brand"];

describe("brandCss", () => {
  it("writes the primary colour as a variable", () => {
    expect(brandCss(brand("#0071ad"))).toBe(":root{--brand-primary:#0071ad}");
  });
  it("writes the accent colour next to it", () => {
    expect(brandCss(brand("#b4492e", "#e0a33b"))).toBe(
      ":root{--brand-primary:#b4492e;--brand-accent:#e0a33b}",
    );
  });
  it("writes nothing it can't be sure is a colour", () => {
    expect(brandCss(brand("red;}body{display:none"))).toBe("");
    expect(brandCss(brand("#fff"))).toBe("");
    expect(brandCss(undefined)).toBe("");
  });
});
