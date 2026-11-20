import { describe, expect, it } from "vitest";
import { decideRedirect } from "./redirects";

const request = new URL("https://bricks.ba/stari-link");

describe("decideRedirect", () => {
  it("is nothing without a redirect", () => {
    expect(decideRedirect(null, request)).toBeNull();
  });

  it("makes a 301 with an absolute address from a path", () => {
    expect(decideRedirect({ code: 301, location: "/en/new" }, request)).toEqual({
      kind: "redirect",
      status: 301,
      location: "https://bricks.ba/en/new",
    });
  });

  it("makes a 302 to another site", () => {
    expect(decideRedirect({ code: 302, location: "https://partner.test/a" }, request)).toEqual({
      kind: "redirect",
      status: 302,
      location: "https://partner.test/a",
    });
  });

  it("is gone for a 410", () => {
    expect(decideRedirect({ code: 410, location: null }, request)).toEqual({ kind: "gone" });
  });

  it("ignores a redirect to the address that was asked for", () => {
    expect(decideRedirect({ code: 301, location: "/stari-link" }, request)).toBeNull();
    expect(
      decideRedirect({ code: 301, location: "https://bricks.ba/stari-link" }, request),
    ).toBeNull();
  });

  it("ignores a target that is not http(s) or is missing", () => {
    expect(decideRedirect({ code: 301, location: "javascript:alert(1)" }, request)).toBeNull();
    expect(decideRedirect({ code: 301, location: null }, request)).toBeNull();
  });
});
