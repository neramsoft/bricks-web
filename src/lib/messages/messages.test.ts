import { describe, expect, it } from "vitest";
import { messagesFor } from "./index";
import { bs } from "./bs";
import { en } from "./en";

describe("messagesFor", () => {
  it("picks the language, ignoring case and region", () => {
    expect(messagesFor("bs")).toBe(bs);
    expect(messagesFor("EN")).toBe(en);
    expect(messagesFor("en-GB")).toBe(en);
  });

  it("falls back to English for a language the site has no texts for", () => {
    expect(messagesFor("de")).toBe(en);
  });

  it("has the same keys in both languages", () => {
    const keys = (value: object): string[] =>
      Object.entries(value).flatMap(([key, child]) =>
        typeof child === "object" ? keys(child).map((sub) => `${key}.${sub}`) : [key],
      );
    expect(keys(bs)).toEqual(keys(en));
  });
});
