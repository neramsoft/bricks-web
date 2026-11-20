import { createProbizClient, unwrap, type ProbizClient } from "@probiz/sdk";
import { SseParser } from "./sse";
import type { OrderPlaced, PlacedOrder, WaiterCall } from "./types";

// The browser's calls to the guest API (docs/decisions/0001 F7): straight to the public API
// address, not through this site's server, so every guest has their own address in the API's rate
// limits. The API's CORS allows the site's origin and the `X-Ordering-Secret` header. Calls throw
// `ProbizApiError` (see errors.ts) or a TypeError when the network fails.

export interface PlaceOrderBody {
  items: Array<{ itemKey: string; priceIndex?: number; qty: number }>;
  note?: string;
  locale: string;
}

export interface GuestApi {
  placeOrder(token: string, body: PlaceOrderBody): Promise<OrderPlaced>;
  getOrder(id: string, secret: string): Promise<PlacedOrder>;
  callWaiter(token: string): Promise<WaiterCall>;
  /**
   * Reads the order's event stream. Resolves when the stream ends (the server ends it after a
   * final status) and rejects when it cannot be read; `onStatus` gets each `order.updated`.
   */
  streamOrder(
    id: string,
    secret: string,
    onStatus: (status: PlacedOrder["status"]) => void,
    signal: AbortSignal,
  ): Promise<void>;
}

const SECRET_HEADER = "X-Ordering-Secret";

export function createGuestApi(baseUrl: string, fetchImpl: typeof fetch = fetch): GuestApi {
  const origin = baseUrl.replace(/\/+$/, "");
  const client: ProbizClient = createProbizClient({
    baseUrl: origin,
    fetch: (input) => fetchImpl(input as Request),
  });
  return {
    async placeOrder(token, body) {
      return unwrap(
        await client.rest.POST("/v1/public/ordering/tables/{token}/orders", {
          params: { path: { token } },
          body,
        }),
      );
    },
    async getOrder(id, secret) {
      return unwrap(
        await client.rest.GET("/v1/public/ordering/orders/{id}", {
          params: { path: { id }, header: { [SECRET_HEADER]: secret } },
        }),
      );
    },
    async callWaiter(token) {
      return unwrap(
        await client.rest.POST("/v1/public/ordering/tables/{token}/call", {
          params: { path: { token } },
        }),
      );
    },
    async streamOrder(id, secret, onStatus, signal) {
      const response = await fetchImpl(
        `${origin}/v1/public/ordering/orders/${encodeURIComponent(id)}/events`,
        {
          headers: { [SECRET_HEADER]: secret, Accept: "text/event-stream" },
          signal,
          cache: "no-store",
        },
      );
      if (!response.ok || !response.body) throw new Error(`stream refused (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SseParser();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        for (const event of parser.push(decoder.decode(value, { stream: true }))) {
          if (event.event !== "order.updated") continue;
          try {
            const data = JSON.parse(event.data) as { status?: PlacedOrder["status"] };
            if (data.status) onStatus(data.status);
          } catch {
            // Not an event this site knows: skip it.
          }
        }
      }
    },
  };
}
