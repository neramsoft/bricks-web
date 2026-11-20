import { ProbizApiError } from "@probiz/sdk";
import { describe, expect, it, vi } from "vitest";
import type { GuestApi } from "./guest-api";
import type { PlacedOrder } from "./types";
import { watchOrder } from "./watch";

const order = (status: PlacedOrder["status"]): PlacedOrder => ({
  id: "o1",
  number: 1,
  status,
  items: [],
  totalCents: 0,
  note: null,
  cancelReason: status === "OTKAZANA" ? "nema" : null,
  createdAt: "2027-01-01T00:00:00Z",
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeTimers() {
  const queue: Array<() => void> = [];
  return {
    setTimer: ((fn: () => void) => {
      queue.push(fn);
      return queue.length as never;
    }) as unknown as typeof setTimeout,
    clearTimer: (() => undefined) as unknown as typeof clearTimeout,
    run: () => queue.shift()?.(),
    size: () => queue.length,
  };
}

describe("watchOrder", () => {
  it("reads the order on each streamed change and stops after a final status", async () => {
    const seen: string[] = [];
    let current: PlacedOrder["status"] = "NOVA";
    const api = {
      getOrder: vi.fn(async () => order(current)),
      streamOrder: vi.fn(async (_id, _secret, onStatus: (s: PlacedOrder["status"]) => void) => {
        onStatus("NOVA");
        await tick();
        current = "NAPLACENA";
        onStatus("NAPLACENA");
      }),
    } as unknown as GuestApi;
    watchOrder(
      api,
      { id: "o1", secret: "s" },
      { onOrder: (o) => seen.push(o.status), onGone: vi.fn() },
    );
    await tick();
    await tick();
    await tick();
    expect(seen).toEqual(["NOVA", "NAPLACENA"]);
    // Ended with a final status: no polling afterwards.
    expect(api.getOrder).toHaveBeenCalledTimes(2);
  });

  it("falls back to polling when the stream fails, and stops at a final status", async () => {
    const timers = fakeTimers();
    const statuses: Array<PlacedOrder["status"]> = ["NOVA", "U_PRIPREMI", "POSLUZENA", "NAPLACENA"];
    const seen: string[] = [];
    const onFallback = vi.fn();
    const api = {
      getOrder: vi.fn(async () => order(statuses.shift() ?? "NAPLACENA")),
      streamOrder: vi.fn(async () => {
        throw new Error("stream refused");
      }),
    } as unknown as GuestApi;
    watchOrder(
      api,
      { id: "o1", secret: "s" },
      { onOrder: (o) => seen.push(o.status), onGone: vi.fn(), onFallback },
      { pollMs: 10_000, ...timers },
    );
    await tick();
    expect(onFallback).toHaveBeenCalledOnce();
    expect(seen).toEqual(["NOVA"]);
    for (let i = 0; i < 3; i += 1) {
      timers.run();
      await tick();
    }
    expect(seen).toEqual(["NOVA", "U_PRIPREMI", "POSLUZENA", "NAPLACENA"]);
    expect(timers.size()).toBe(0);
  });

  it("tells when the order is gone (wrong secret) and stops", async () => {
    const onGone = vi.fn();
    const api = {
      getOrder: vi.fn(async () => {
        throw new ProbizApiError({ status: 404, code: "ORDER_NOT_FOUND", message: "x" });
      }),
      streamOrder: vi.fn(async () => {
        throw new Error("no");
      }),
    } as unknown as GuestApi;
    const timers = fakeTimers();
    watchOrder(api, { id: "o1", secret: "s" }, { onOrder: vi.fn(), onGone }, { ...timers });
    await tick();
    await tick();
    expect(onGone).toHaveBeenCalledOnce();
    expect(timers.size()).toBe(0);
  });

  it("stops when asked", async () => {
    const api = {
      getOrder: vi.fn(async () => order("NOVA")),
      streamOrder: vi.fn(
        (_i: string, _s: string, _on: unknown, signal: AbortSignal) =>
          new Promise<void>((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(new Error("aborted"))),
          ),
      ),
    } as unknown as GuestApi;
    const timers = fakeTimers();
    const stop = watchOrder(
      api,
      { id: "o1", secret: "s" },
      { onOrder: vi.fn(), onGone: vi.fn() },
      { ...timers },
    );
    stop();
    await tick();
    expect(timers.size()).toBe(0);
    expect(api.getOrder).not.toHaveBeenCalled();
  });
});
