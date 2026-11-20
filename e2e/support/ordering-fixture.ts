import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiComponents } from "@probiz/sdk";

// The table-ordering part of the fake CMS API: the guest routes of ProBiz CMS 1.0.0
// (apps/api/src/ordering/public-ordering.controller.ts) with the same answers and error codes, a
// small order state machine the tests step by hand (`/__ordering/advance`), and an SSE stream that
// says each status change. Prices are whole cents; the server prices the order, never the guest.

type S = ApiComponents["schemas"];
type Status = S["PublicOrderingOrder"]["status"];

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Tokens the tests open. Anything else is an unknown code. */
export const TOKENS = {
  open: "ABCDE12345",
  closed: "CLOSED1234",
  noCalls: "NOCALLS123",
  disabled: "DISABLED12",
} as const;

export const ITEMS = {
  espresso: id(8101),
  latte: id(8102),
  lemonade: id(8103),
  beer: id(8104),
  burger: id(8105),
  iced: id(8106),
} as const;

const item = (
  itemKey: string,
  name: string,
  prices: Array<{ label: string | null; amount: number }>,
  extra: Partial<S["PublicOrderingItem"]> = {},
): S["PublicOrderingItem"] => ({
  itemKey,
  name,
  description: null,
  image: null,
  prices,
  allergens: [],
  dietary: [],
  spicy: 0,
  recommended: false,
  unavailable: false,
  ...extra,
});

export function orderingMenus(locale: string): S["PublicOrderingMenu"][] {
  const en = locale === "en";
  return [
    {
      id: id(8001),
      title: en ? "Drinks and food" : "Piće i hrana",
      summary: null,
      sections: [
        {
          id: id(8011),
          title: en ? "Coffee" : "Kafa",
          description: null,
          items: [
            item(ITEMS.espresso, "Espresso", [{ label: null, amount: 200 }], {
              description: en ? "Double shot on request" : "Dupli na zahtjev",
            }),
            item(ITEMS.latte, "Latte macchiato", [{ label: null, amount: 350 }]),
            item(ITEMS.iced, en ? "Iced coffee" : "Ledena kafa", [{ label: null, amount: 400 }], {
              unavailable: true,
            }),
          ],
        },
        {
          id: id(8012),
          title: en ? "Cold drinks" : "Hladna pića",
          description: null,
          items: [
            item(ITEMS.lemonade, en ? "Homemade lemonade" : "Domaća limunada", [
              { label: "0,3 l", amount: 300 },
              { label: "0,5 l", amount: 450 },
            ]),
            item(ITEMS.beer, en ? "Draught beer" : "Točeno pivo", [
              { label: "0,3 l", amount: 350 },
              { label: "0,5 l", amount: 500 },
            ]),
          ],
        },
        {
          id: id(8013),
          title: en ? "Food" : "Hrana",
          description: null,
          items: [
            item(ITEMS.burger, "Bricks burger", [{ label: null, amount: 1250 }], {
              description: en ? "Beef, cheddar, house sauce" : "Junetina, čedar, kućni umak",
            }),
          ],
        },
      ],
    },
  ];
}

const hours = (closed: boolean): S["PublicTodayHours"] => ({
  date: new Date().toISOString().slice(0, 10),
  closed,
  intervals: closed ? [] : [{ opens: "07:00", closes: "23:00" }],
  label: null,
});

export function tablePage(token: string, locale: string): S["PublicOrderingPage"] | null {
  const en = locale === "en";
  const base = {
    locale: en ? "en" : "bs",
    languages: ["bs", "en"],
    currency: "BAM",
    menus: orderingMenus(en ? "en" : "bs"),
  };
  switch (token.toUpperCase()) {
    case TOKENS.open:
      return {
        ...base,
        table: { number: 7, section: "Bašta", seats: 4 },
        venue: { name: "Bricks Tuzla", openNow: true, todayHours: hours(false) },
        callsEnabled: true,
      };
    case TOKENS.noCalls:
      return {
        ...base,
        table: { number: 3, section: "Unutra", seats: 2 },
        venue: { name: "Bricks Tuzla", openNow: true, todayHours: hours(false) },
        callsEnabled: false,
      };
    case TOKENS.closed:
      return {
        ...base,
        table: { number: 2, section: "Unutra", seats: 2 },
        venue: { name: "Bricks Tuzla", openNow: false, todayHours: hours(false) },
        callsEnabled: true,
      };
  }
  return null;
}

interface StoredOrder {
  order: S["PublicOrderingOrder"];
  secret: string;
  token: string;
  listeners: Set<ServerResponse>;
}

const ORDER = ["NOVA", "U_PRIPREMI", "POSLUZENA", "NAPLACENA"] as const;

export interface OrderingState {
  orders: Map<string, StoredOrder>;
  counter: number;
  /** Tables with an open waiter call. */
  calls: Set<string>;
  sseDown: boolean;
}

export const newOrderingState = (): OrderingState => ({
  orders: new Map(),
  counter: 1041,
  calls: new Set(),
  sseDown: false,
});

const error = (statusCode: number, code: string, message: string, extra: object = {}) => ({
  statusCode,
  code,
  message,
  ...extra,
});

type Send = (status: number, body: unknown, headers?: Record<string, string>) => void;

const secretOf = (request: IncomingMessage) => String(request.headers["x-ordering-secret"] ?? "");

function find(state: OrderingState, orderId: string, request: IncomingMessage) {
  const stored = state.orders.get(orderId);
  return stored && stored.secret === secretOf(request) ? stored : null;
}

const frame = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/**
 * Answers a guest ordering request, or returns false when the path is not one. `body` is the
 * parsed JSON of a POST. Notes steer the failures a test wants: `#unavailable`, `#pricechanged`,
 * `#closed`, `#waiter`, `#limit` (429 with Retry-After).
 */
export function handleOrdering(
  state: OrderingState,
  request: IncomingMessage,
  path: string,
  locale: string,
  body: unknown,
  send: Send,
  response: ServerResponse,
): boolean {
  const table = /^\/v1\/public\/ordering\/tables\/([^/]+)(\/orders|\/call)?$/.exec(path);
  if (table) {
    const token = decodeURIComponent(table[1]!);
    if (token.toUpperCase() === TOKENS.disabled) {
      send(404, error(404, "MODULE_DISABLED", "The ordering module is off"));
      return true;
    }
    const page = tablePage(token, locale);
    if (!page) {
      send(404, error(404, "ORDERING_TABLE_NOT_FOUND", "No such table"));
      return true;
    }
    if (!table[2] && request.method === "GET") {
      send(200, page);
      return true;
    }
    if (table[2] === "/call" && request.method === "POST") {
      if (!page.callsEnabled) {
        send(409, error(409, "ORDERING_CALLS_DISABLED", "Calls are off"));
        return true;
      }
      const already = state.calls.has(token.toUpperCase());
      state.calls.add(token.toUpperCase());
      send(201, {
        id: id(8900),
        createdAt: new Date().toISOString(),
        alreadyOpen: already,
      } satisfies S["PublicOrderingCall"]);
      return true;
    }
    if (table[2] === "/orders" && request.method === "POST") {
      placeOrder(state, token, page, body, send);
      return true;
    }
    return false;
  }

  const one = /^\/v1\/public\/ordering\/orders\/([^/]+)(\/events)?$/.exec(path);
  if (!one || request.method !== "GET") return false;
  const stored = find(state, decodeURIComponent(one[1]!), request);
  if (!stored) {
    send(404, error(404, "ORDER_NOT_FOUND", "No such order"));
    return true;
  }
  if (!one[2]) {
    send(200, stored.order);
    return true;
  }
  if (state.sseDown) {
    send(503, error(503, "UNAVAILABLE", "The stream is down"));
    return true;
  }
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store, no-transform",
  });
  // The API's own preamble: a retry hint, then the current status, with a heartbeat comment.
  response.write("retry: 5000\n\n");
  response.write(": ping\n\n");
  const status = stored.order.status;
  response.write(frame("order.updated", { type: "order.updated", id: stored.order.id, status }));
  if (status === "NAPLACENA" || status === "OTKAZANA") {
    response.end();
    return true;
  }
  stored.listeners.add(response);
  request.on("close", () => stored.listeners.delete(response));
  return true;
}

function placeOrder(
  state: OrderingState,
  token: string,
  page: S["PublicOrderingPage"],
  body: unknown,
  send: Send,
) {
  const input = (body ?? {}) as {
    items?: Array<{ itemKey?: string; priceIndex?: number | null; qty?: number }>;
    note?: string;
    locale?: string;
  };
  const rows = input.items ?? [];
  const issue = (code: string, path = "items") =>
    send(
      400,
      error(400, "VALIDATION_FAILED", "Invalid", { issues: [{ path, code, message: code }] }),
    );
  if (rows.length === 0) return issue("items_required");
  if (rows.length > 50) return issue("too_many_items");
  const note = input.note ?? "";
  if (note.includes("#limit")) {
    return send(429, error(429, "TOO_MANY_ATTEMPTS", "Too many orders", { retryAfterSec: 30 }), {
      "retry-after": "30",
    });
  }
  if (!page.venue.openNow || note.includes("#closed")) {
    return send(409, error(409, "ORDERING_CLOSED", "The venue is closed"));
  }
  if (note.includes("#waiter")) {
    return send(409, error(409, "ORDERING_NEEDS_WAITER", "Ask a waiter"));
  }
  const all = new Map(
    page.menus.flatMap((m) => m.sections.flatMap((s) => s.items)).map((i) => [i.itemKey, i]),
  );
  const lines: S["PublicOrderingOrderItem"][] = [];
  const unavailable: string[] = [];
  for (const row of rows) {
    const found = row.itemKey ? all.get(row.itemKey) : undefined;
    if (!found || found.unavailable) {
      unavailable.push(row.itemKey ?? "");
      continue;
    }
    if (!Number.isInteger(row.qty) || row.qty! < 1 || row.qty! > 20) return issue("qty_range");
    const index = row.priceIndex ?? (found.prices.length === 1 ? 0 : null);
    if (index === null) return issue("price_index");
    const price = found.prices[index];
    if (!price) {
      return send(409, error(409, "ORDERING_PRICE_CHANGED", "Reload the menu"));
    }
    lines.push({
      itemKey: found.itemKey,
      name: found.name,
      priceLabel: price.label,
      unitPriceCents: price.amount,
      qty: row.qty!,
    });
  }
  if (note.includes("#unavailable") && lines[0]) unavailable.push(lines[0].itemKey);
  if (unavailable.length > 0) {
    return send(
      409,
      error(409, "ORDERING_ITEM_UNAVAILABLE", "Some items cannot be ordered", {
        ids: unavailable,
        detail: { itemKeys: unavailable.join(",") },
      }),
    );
  }
  if (note.includes("#pricechanged")) {
    return send(409, error(409, "ORDERING_PRICE_CHANGED", "Reload the menu"));
  }
  state.counter += 1;
  const order: S["PublicOrderingOrder"] = {
    id: id(8200 + state.counter),
    number: state.counter,
    status: "NOVA",
    items: lines,
    totalCents: lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0),
    note: note || null,
    cancelReason: null,
    createdAt: new Date().toISOString(),
  };
  const secret = `secret-${order.id}`;
  state.orders.set(order.id, { order, secret, token, listeners: new Set() });
  send(201, { order, guestSecret: secret } satisfies S["PublicOrderingOrderPlaced"]);
}

/**
 * Staff action stand-in: moves every order to its next status (or to `to`, with a `reason` for a
 * cancel) and tells the streams that are open.
 */
export function advance(state: OrderingState, to: Status | null, reason: string | null) {
  for (const stored of state.orders.values()) {
    const current = stored.order.status;
    const next: Status | null =
      to ?? (current === "OTKAZANA" ? null : (ORDER[ORDER.indexOf(current as never) + 1] ?? null));
    if (!next) continue;
    stored.order = {
      ...stored.order,
      status: next,
      cancelReason: next === "OTKAZANA" ? reason : null,
    };
    for (const listener of stored.listeners) {
      listener.write(
        frame("order.updated", { type: "order.updated", id: stored.order.id, status: next }),
      );
      if (next === "NAPLACENA" || next === "OTKAZANA") listener.end();
    }
    if (next === "NAPLACENA" || next === "OTKAZANA") stored.listeners.clear();
  }
}
