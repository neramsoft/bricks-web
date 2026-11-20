import { describe, expect, it } from "vitest";
import { acceptedLanguages, requestedLocale } from "./locale";

describe("table page language", () => {
  const available = ["bs", "en"];

  it("orders Accept-Language by q", () => {
    expect(acceptedLanguages("de-DE,en;q=0.8,bs;q=0.9,*;q=0.1")).toEqual(["de-de", "bs", "en"]);
    expect(acceptedLanguages(null)).toEqual([]);
  });

  it("prefers ?lang= when the site has it", () => {
    expect(requestedLocale("en", "bs", available)).toBe("en");
    expect(requestedLocale("EN", null, available)).toBe("en");
  });

  it("falls to the browser's best language among the site's, region ignored", () => {
    expect(requestedLocale("xx", "de, en-GB;q=0.8", available)).toBe("en");
    expect(requestedLocale(null, "bs-BA", available)).toBe("bs");
  });

  it("is undefined (the API's default) when nothing matches", () => {
    expect(requestedLocale(null, "de, fr", available)).toBeUndefined();
    expect(requestedLocale(undefined, undefined, available)).toBeUndefined();
  });
});
