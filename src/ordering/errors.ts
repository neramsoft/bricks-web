import { isProbizApiError } from "@probiz/sdk";

// From what went wrong to what the guest is told. The API's codes are the contract; its English
// messages are never shown, so the page speaks the guest's language (lib/messages).

export type Failure =
  | { kind: "closed" }
  | { kind: "needs_waiter" }
  | { kind: "item_unavailable"; itemKeys: string[] }
  | { kind: "price_changed" }
  | { kind: "rate_limited"; retryAfterSec: number | null }
  | { kind: "validation" }
  | { kind: "table_not_found" }
  | { kind: "calls_disabled" }
  | { kind: "order_gone" }
  | { kind: "network" }
  | { kind: "other" };

/** Splits the API's comma separated `detail.itemKeys`. */
export function itemKeysOf(detail: unknown): string[] {
  if (typeof detail !== "object" || detail === null) return [];
  const value = (detail as Record<string, unknown>).itemKeys;
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

/** Classifies a thrown error from a call to the guest API. */
export function failureOf(error: unknown): Failure {
  if (!isProbizApiError(error)) return { kind: "network" };
  switch (error.code) {
    case "ORDERING_CLOSED":
      return { kind: "closed" };
    case "ORDERING_NEEDS_WAITER":
      return { kind: "needs_waiter" };
    case "ORDERING_ITEM_UNAVAILABLE":
      return { kind: "item_unavailable", itemKeys: itemKeysOf(error.detail) };
    case "ORDERING_PRICE_CHANGED":
      return { kind: "price_changed" };
    case "TOO_MANY_ATTEMPTS":
      return { kind: "rate_limited", retryAfterSec: error.retryAfterSec ?? null };
    case "VALIDATION_FAILED":
      return { kind: "validation" };
    case "ORDERING_TABLE_NOT_FOUND":
      return { kind: "table_not_found" };
    case "ORDERING_CALLS_DISABLED":
      return { kind: "calls_disabled" };
    case "ORDER_NOT_FOUND":
      return { kind: "order_gone" };
  }
  if (error.status === 429)
    return { kind: "rate_limited", retryAfterSec: error.retryAfterSec ?? null };
  return { kind: "other" };
}

export interface FailureTexts {
  closed: string;
  needsWaiter: string;
  itemUnavailable: string;
  priceChanged: string;
  /** `{seconds}` is the wait. */
  rateLimited: string;
  rateLimitedNoTime: string;
  validation: string;
  tableNotFound: string;
  callsDisabled: string;
  orderGone: string;
  network: string;
  other: string;
}

/** The sentence for a failure. */
export function describeFailure(failure: Failure, texts: FailureTexts): string {
  switch (failure.kind) {
    case "closed":
      return texts.closed;
    case "needs_waiter":
      return texts.needsWaiter;
    case "item_unavailable":
      return texts.itemUnavailable;
    case "price_changed":
      return texts.priceChanged;
    case "rate_limited":
      return failure.retryAfterSec !== null
        ? texts.rateLimited.replace(
            "{seconds}",
            String(Math.max(1, Math.ceil(failure.retryAfterSec))),
          )
        : texts.rateLimitedNoTime;
    case "validation":
      return texts.validation;
    case "table_not_found":
      return texts.tableNotFound;
    case "calls_disabled":
      return texts.callsDisabled;
    case "order_gone":
      return texts.orderGone;
    case "network":
      return texts.network;
    case "other":
      return texts.other;
  }
}
