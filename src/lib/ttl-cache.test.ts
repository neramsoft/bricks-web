import { describe, expect, it } from "vitest";
import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  it("keeps a value until its lifetime ends", () => {
    let now = 1000;
    const cache = new TtlCache<string>(100, 10, () => now);
    cache.set("a", "x");
    now = 1099;
    expect(cache.get("a")).toBe("x");
    now = 1100;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("drops the oldest entry at the limit", () => {
    const cache = new TtlCache<number>(1000, 2, () => 0);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("replaces a value without dropping another", () => {
    const cache = new TtlCache<number>(1000, 2, () => 0);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 3);
    expect(cache.get("a")).toBe(3);
    expect(cache.get("b")).toBe(2);
  });

  it("can be cleared", () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
