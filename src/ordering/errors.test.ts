import { ProbizApiError } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { describeFailure, failureOf, itemKeysOf } from "./errors";
import { bs } from "@/lib/messages/bs";
import { en } from "@/lib/messages/en";

const api = (
  code: string,
  status = 409,
  extra: Partial<ConstructorParameters<typeof ProbizApiError>[0]> = {},
) => new ProbizApiError({ status, code, message: "x", ...extra });

describe("failureOf", () => {
  it("maps the API's codes", () => {
    expect(failureOf(api("ORDERING_CLOSED")).kind).toBe("closed");
    expect(failureOf(api("ORDERING_NEEDS_WAITER")).kind).toBe("needs_waiter");
    expect(failureOf(api("ORDERING_PRICE_CHANGED")).kind).toBe("price_changed");
    expect(failureOf(api("VALIDATION_FAILED", 400)).kind).toBe("validation");
    expect(failureOf(api("ORDERING_TABLE_NOT_FOUND", 404)).kind).toBe("table_not_found");
    expect(failureOf(api("ORDERING_CALLS_DISABLED")).kind).toBe("calls_disabled");
    expect(failureOf(api("ORDER_NOT_FOUND", 404)).kind).toBe("order_gone");
    expect(failureOf(api("SOMETHING", 500)).kind).toBe("other");
  });

  it("names the unavailable items from the comma separated detail", () => {
    expect(
      failureOf(api("ORDERING_ITEM_UNAVAILABLE", 409, { detail: { itemKeys: "a, b,,c" } })),
    ).toEqual({ kind: "item_unavailable", itemKeys: ["a", "b", "c"] });
    expect(itemKeysOf(undefined)).toEqual([]);
    expect(itemKeysOf({ itemKeys: 3 })).toEqual([]);
  });

  it("carries Retry-After of a 429, whatever its code", () => {
    expect(failureOf(api("TOO_MANY_ATTEMPTS", 429, { retryAfterSec: 30 }))).toEqual({
      kind: "rate_limited",
      retryAfterSec: 30,
    });
    expect(failureOf(api("OTHER", 429))).toEqual({ kind: "rate_limited", retryAfterSec: null });
  });

  it("is a network failure for anything that is not an API answer", () => {
    expect(failureOf(new TypeError("Failed to fetch")).kind).toBe("network");
  });
});

describe("describeFailure", () => {
  it("speaks both languages and fills in the wait", () => {
    expect(describeFailure({ kind: "rate_limited", retryAfterSec: 29.2 }, bs.ordering.errors)).toBe(
      "Previše pokušaja. Pokušaj ponovo za 30 s.",
    );
    expect(
      describeFailure({ kind: "rate_limited", retryAfterSec: null }, en.ordering.errors),
    ).toMatch(/Too many attempts/);
    expect(describeFailure({ kind: "closed" }, bs.ordering.errors)).toMatch(/narudžbe/);
    expect(describeFailure({ kind: "network" }, en.ordering.errors)).toMatch(/connection/);
  });
});
