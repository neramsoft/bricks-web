import { describe, expect, it } from "vitest";
import { SECRET_TTL_MS, forgetOrder, openOrderOf, saveOrder, type StorageLike } from "./secrets";

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const order = { orderId: "o1", token: "ABCDE12345", secret: "s3", number: 1042 };

describe("guest secret storage", () => {
  it("resumes the open order of this table, any case of the token", () => {
    const storage = memory();
    saveOrder(storage, order, 1000);
    expect(openOrderOf(storage, "abcde12345", 2000)).toMatchObject({ orderId: "o1", secret: "s3" });
    expect(openOrderOf(storage, "OTHERTABLE", 2000)).toBeNull();
  });

  it("expires after 12 hours and clears the entry", () => {
    const storage = memory();
    saveOrder(storage, order, 0);
    expect(openOrderOf(storage, order.token, SECRET_TTL_MS - 1)).not.toBeNull();
    expect(openOrderOf(storage, order.token, SECRET_TTL_MS)).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it("forgets an order (paid or cancelled)", () => {
    const storage = memory();
    saveOrder(storage, order);
    forgetOrder(storage, "o1");
    expect(openOrderOf(storage, order.token)).toBeNull();
  });

  it("takes the newest of several and drops damaged entries", () => {
    const storage = memory();
    saveOrder(storage, { ...order, orderId: "old" }, 1000);
    saveOrder(storage, { ...order, orderId: "new" }, 5000);
    storage.setItem("bricks.order.bad", "{nope");
    storage.setItem("other.key", "x");
    expect(openOrderOf(storage, order.token, 6000)?.orderId).toBe("new");
  });

  it("does nothing without storage or with a full one", () => {
    expect(() => saveOrder(null, order)).not.toThrow();
    expect(openOrderOf(null, order.token)).toBeNull();
    const full: StorageLike = {
      ...memory(),
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => saveOrder(full, order)).not.toThrow();
  });
});
