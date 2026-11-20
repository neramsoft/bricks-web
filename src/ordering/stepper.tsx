"use client";

import { fill } from "@/lib/format";
import type { Messages } from "@/lib/messages";

/** The quantity control: a lone "+" at 0, "−  n  +" after. Labelled for screen readers by the item. */
export function Stepper({
  name,
  qty,
  max,
  disabled,
  canAdd,
  messages,
  onAdd,
  onRemove,
}: {
  name: string;
  qty: number;
  max: number;
  disabled?: boolean;
  canAdd?: boolean;
  messages: Messages["ordering"];
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="ord-qty"
      data-n={qty}
      role="group"
      aria-label={fill(messages.quantity, { name })}
    >
      {qty > 0 ? (
        <>
          <button
            type="button"
            className="ord-minus"
            aria-label={fill(messages.fewer, { name })}
            onClick={onRemove}
          >
            <span aria-hidden="true">−</span>
          </button>
          <b aria-hidden="true">{qty}</b>
          <span className="sr-only">{qty}</span>
        </>
      ) : null}
      <button
        type="button"
        className="ord-add"
        aria-label={fill(qty > 0 ? messages.more : messages.add, { name })}
        disabled={disabled || qty >= max || canAdd === false}
        onClick={onAdd}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
