// The guest's secret of an order (`guestSecret`, shown once by the API) kept in localStorage per
// order, with a 12 hour life, so the status survives a closed tab. It is removed when the order is
// paid or cancelled and when it is found expired. Storage may be missing or full (private
// windows): every call then does nothing.

export const SECRET_TTL_MS = 12 * 60 * 60 * 1000;
const PREFIX = "bricks.order.";

export interface StoredOrder {
  orderId: string;
  token: string;
  secret: string;
  /** The order's number within the day, for the confirmation before the API has answered again. */
  number: number;
  expiresAt: number;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function saveOrder(
  storage: StorageLike | null,
  order: Omit<StoredOrder, "expiresAt">,
  now = Date.now(),
): void {
  try {
    storage?.setItem(
      PREFIX + order.orderId,
      JSON.stringify({ ...order, expiresAt: now + SECRET_TTL_MS } satisfies StoredOrder),
    );
  } catch {
    // Full or blocked: the order still works for this page view.
  }
}

export function forgetOrder(storage: StorageLike | null, orderId: string): void {
  try {
    storage?.removeItem(PREFIX + orderId);
  } catch {
    // Nothing to do.
  }
}

function read(storage: StorageLike, key: string, now: number): StoredOrder | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredOrder>;
    if (
      typeof value.orderId !== "string" ||
      typeof value.token !== "string" ||
      typeof value.secret !== "string" ||
      typeof value.number !== "number" ||
      typeof value.expiresAt !== "number" ||
      value.expiresAt <= now
    ) {
      storage.removeItem(key);
      return null;
    }
    return value as StoredOrder;
  } catch {
    return null;
  }
}

/** The newest unexpired order of this table that is still kept; expired entries are cleared on the way. */
export function openOrderOf(
  storage: StorageLike | null,
  token: string,
  now = Date.now(),
): StoredOrder | null {
  if (!storage) return null;
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
  } catch {
    return null;
  }
  let best: StoredOrder | null = null;
  for (const key of keys) {
    const order = read(storage, key, now);
    if (order && order.token.toLowerCase() === token.toLowerCase()) {
      if (!best || order.expiresAt > best.expiresAt) best = order;
    }
  }
  return best;
}
