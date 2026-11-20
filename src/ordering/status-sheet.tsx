"use client";

import { fill, formatMoney } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import { Sheet } from "./sheet";
import { stepStates } from "./status";
import type { OrderingPage, PlacedOrder } from "./types";

export interface TrackedOrder {
  order: PlacedOrder;
  secret: string;
  /** True once the stream failed and the order is checked by polling. */
  polling: boolean;
}

/** The confirmation: the order number, the three steps (a live region announces each change) and what was ordered. */
export function StatusSheet({
  page,
  tracked,
  messages,
  onOrderMore,
  onCall,
  onClose,
}: {
  page: OrderingPage;
  tracked: TrackedOrder;
  messages: Messages["ordering"];
  onOrderMore: () => void;
  onCall: (() => void) | null;
  onClose: () => void;
}) {
  const { order } = tracked;
  const money = (cents: number) => formatMoney(cents, page.currency, page.locale);
  const number = page.table.number;
  return (
    <Sheet titleId="st-title" onClose={onClose}>
      <div className="ord-head">
        <h2 id="st-title">{messages.statusTitle[order.status]}</h2>
        <button type="button" onClick={onClose}>
          {messages.close}
        </button>
      </div>
      <p className="sr-only" role="status">
        {messages.statusTitle[order.status]}
      </p>
      <div className="ord-done">
        <div className="ord-num" aria-label={`${messages.orderNumber} ${order.number}`}>
          #{order.number}
        </div>
        <p>{fill(messages.statusText[order.status], { number })}</p>
        {order.status === "OTKAZANA" && order.cancelReason ? (
          <p className="ord-reason">
            {fill(messages.cancelReason, { reason: order.cancelReason })}
          </p>
        ) : null}
      </div>
      <ol className="ord-steps" data-status={order.status}>
        {stepStates(order.status).map(({ key, state }) => (
          <li key={key} data-state={state}>
            {messages.steps[key]}
            {state !== "todo" ? (
              <span className="sr-only">
                {" "}
                ({state === "done" ? messages.stepDone : messages.stepNow})
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <ul className="ord-ordered">
        {order.items.map((item) => (
          <li key={`${item.itemKey}:${item.priceLabel ?? ""}`}>
            {item.qty}× {item.name}
            {item.priceLabel ? ` (${item.priceLabel})` : ""}
          </li>
        ))}
      </ul>
      <p className="ord-ordered-total">{money(order.totalCents)}</p>
      {tracked.polling && order.status !== "NAPLACENA" && order.status !== "OTKAZANA" ? (
        <p className="ord-fine">{messages.lostConnection}</p>
      ) : null}
      <div className="ord-actions">
        <button className="btn quiet" type="button" onClick={onOrderMore}>
          {messages.orderMore}
        </button>
        {onCall ? (
          <button className="btn quiet" type="button" onClick={onCall}>
            {messages.callWaiter}
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
