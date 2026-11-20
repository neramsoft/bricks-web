"use client";

import { fill, formatMoney } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import { MAX_NOTE, MAX_QTY, canAddRow, unitCents, type CartLine } from "./cart";
import { Sheet } from "./sheet";
import { Stepper } from "./stepper";
import type { OrderingItem, OrderingPage } from "./types";

export function CartSheet({
  page,
  items,
  lines,
  note,
  total,
  flagged,
  error,
  placing,
  closed,
  messages,
  onNote,
  onAdd,
  onRemove,
  onPlace,
  onClose,
}: {
  page: OrderingPage;
  items: Map<string, OrderingItem>;
  lines: readonly CartLine[];
  note: string;
  total: number;
  flagged: ReadonlySet<string>;
  error: string | null;
  placing: boolean;
  closed: boolean;
  messages: Messages["ordering"];
  onNote: (value: string) => void;
  onAdd: (itemKey: string, priceIndex: number) => void;
  onRemove: (itemKey: string, priceIndex: number) => void;
  onPlace: () => void;
  onClose: () => void;
}) {
  const money = (cents: number) => formatMoney(cents, page.currency, page.locale);
  return (
    <Sheet titleId="cart-title" onClose={onClose}>
      <div className="ord-head">
        <h2 id="cart-title">{messages.cartTitle}</h2>
        <button type="button" onClick={onClose}>
          {messages.close}
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="ord-empty">{messages.cartEmpty}</p>
      ) : (
        <ul>
          {lines.map((line) => {
            const item = items.get(line.itemKey);
            const price = item?.prices[line.priceIndex];
            const unit = unitCents(items, line) ?? 0;
            const name = [item?.name ?? "", item && item.prices.length > 1 ? price?.label : null]
              .filter(Boolean)
              .join(" ");
            const bad = flagged.has(line.itemKey);
            return (
              <li
                key={`${line.itemKey}:${line.priceIndex}`}
                className="ord-line"
                data-flagged={bad}
              >
                <div>
                  <div className="ord-n">{name}</div>
                  <div className="ord-p">{money(unit)}</div>
                  {bad ? <div className="ord-off">{messages.unavailableItem}</div> : null}
                </div>
                <Stepper
                  name={name}
                  qty={line.qty}
                  max={MAX_QTY}
                  canAdd={canAddRow(lines, line.itemKey, line.priceIndex)}
                  messages={messages}
                  onAdd={() => onAdd(line.itemKey, line.priceIndex)}
                  onRemove={() => onRemove(line.itemKey, line.priceIndex)}
                />
                <div className="ord-sum">{money(unit * line.qty)}</div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="ord-field">
        <label htmlFor="note">{messages.noteLabel}</label>
        <textarea
          id="note"
          value={note}
          maxLength={MAX_NOTE}
          placeholder={messages.notePlaceholder}
          aria-describedby="note-limit"
          onChange={(event) => onNote(event.target.value)}
        />
        <p id="note-limit" className="ord-hint">
          {fill(messages.noteLimit, { max: MAX_NOTE })}
        </p>
      </div>
      <div className="ord-total">
        <span>{messages.total}</span>
        <b>{money(total)}</b>
      </div>
      <p className="ord-error" role="alert">
        {error}
      </p>
      <button
        className="btn ord-place"
        type="button"
        disabled={lines.length === 0 || placing || closed}
        aria-busy={placing}
        onClick={onPlace}
      >
        {closed
          ? messages.closedOrdering
          : placing
            ? messages.placing
            : fill(messages.place, { number: page.table.number })}
      </button>
      <p className="ord-fine">{messages.fine}</p>
    </Sheet>
  );
}
