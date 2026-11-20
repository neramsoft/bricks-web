import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format";
import { tokenOf } from "./table-check";

describe("money on the table page", () => {
  it("formats whole cents in the page's language", () => {
    expect(formatMoney(250, "BAM", "bs")).toMatch(/2,50\s*KM/);
    expect(formatMoney(2150, "BAM", "en")).toMatch(/21\.50/);
    expect(formatMoney(0, "BAM", "bs")).toMatch(/0,00/);
  });

  it("does not turn cents into floating point drift", () => {
    expect(formatMoney(1250 + 5 * 10, "BAM", "bs")).toMatch(/13,00/);
  });
});

describe("tokenOf", () => {
  it("reads the table code of /s/<token>", () => {
    expect(tokenOf("/s/ABCDE12345")).toBe("ABCDE12345");
    expect(tokenOf("/s/ABCDE12345/")).toBe("ABCDE12345");
    expect(tokenOf("/s")).toBeNull();
    expect(tokenOf("/s/a/b")).toBeNull();
    expect(tokenOf("/s/%E0%A4%A")).toBeNull();
  });
});
