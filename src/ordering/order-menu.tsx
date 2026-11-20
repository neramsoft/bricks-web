"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import { MAX_QTY, canAddRow, qtyOf, type CartLine } from "./cart";
import { Stepper } from "./stepper";
import type { OrderingMenu, OrderingPage } from "./types";

interface Props {
  page: OrderingPage;
  lines: readonly CartLine[];
  disabled: boolean;
  messages: Messages["ordering"];
  onAdd: (itemKey: string, priceIndex: number) => void;
  onRemove: (itemKey: string, priceIndex: number) => void;
}

const sectionsOf = (menus: readonly OrderingMenu[]) =>
  menus.flatMap((menu, menuIndex) =>
    menu.sections
      .filter((section) => section.items.length > 0)
      .map((section, index) => ({
        section,
        menuTitle: menus.length > 1 && index === 0 ? menu.title : null,
        menuIndex,
      })),
  );

/** The sticky category bar and the menu, drawn on the server too (the first HTML has every dish). */
export function OrderMenu({ page, lines, disabled, messages, onAdd, onRemove }: Props) {
  const groups = sectionsOf(page.menus);
  const [active, setActive] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>("[data-ord-section]")];
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    targets.forEach((target) => io.observe(target));
    return () => io.disconnect();
  }, [page]);

  useEffect(() => {
    // Keeps the current category's link in view in the horizontally scrolling bar.
    const link = bar.current?.querySelector<HTMLElement>('a[aria-current="true"]');
    link?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [active]);

  const money = (cents: number) => formatMoney(cents, page.currency, page.locale);

  return (
    <>
      <nav ref={bar} className="ord-jump" aria-label={messages.categories}>
        {groups.map(({ section }) => (
          <a
            key={section.id}
            href={`#c-${section.id}`}
            aria-current={active === `c-${section.id}` ? "true" : undefined}
            className={active === `c-${section.id}` ? "on" : undefined}
          >
            {section.title}
          </a>
        ))}
      </nav>
      <main id="menu">
        {groups.map(({ section, menuTitle }) => (
          <section key={section.id} aria-labelledby={`h-${section.id}`}>
            <div className="ord-cat" id={`c-${section.id}`} data-ord-section>
              {menuTitle ? <p className="ord-eyebrow">{menuTitle}</p> : null}
              <h2 id={`h-${section.id}`}>{section.title}</h2>
              {section.description ? <p className="ord-cat-note">{section.description}</p> : null}
            </div>
            <ul className="ord-items">
              {section.items.map((item) => {
                const several = item.prices.length > 1;
                const off = disabled || item.unavailable;
                return (
                  <li key={item.itemKey} className="ord-row" data-unavailable={item.unavailable}>
                    <div className="ord-info">
                      <div className="ord-n">{item.name}</div>
                      {!several && item.prices[0] ? (
                        <div className="ord-p">{money(item.prices[0].amount)}</div>
                      ) : null}
                      {item.description ? <div className="ord-note">{item.description}</div> : null}
                      {item.unavailable ? (
                        <div className="ord-off">{messages.unavailableItem}</div>
                      ) : null}
                    </div>
                    {!several ? (
                      <Stepper
                        name={item.name}
                        qty={qtyOf(lines, item.itemKey, 0)}
                        max={MAX_QTY}
                        disabled={off || item.prices.length === 0}
                        canAdd={canAddRow(lines, item.itemKey, 0)}
                        messages={messages}
                        onAdd={() => onAdd(item.itemKey, 0)}
                        onRemove={() => onRemove(item.itemKey, 0)}
                      />
                    ) : (
                      <ul className="ord-prices">
                        {item.prices.map((price, index) => {
                          const label = [item.name, price.label].filter(Boolean).join(" ");
                          return (
                            <li key={index}>
                              <span className="ord-p">
                                {price.label ? <b>{price.label}</b> : null} {money(price.amount)}
                              </span>
                              <Stepper
                                name={label}
                                qty={qtyOf(lines, item.itemKey, index)}
                                max={MAX_QTY}
                                disabled={off}
                                canAdd={canAddRow(lines, item.itemKey, index)}
                                messages={messages}
                                onAdd={() => onAdd(item.itemKey, index)}
                                onRemove={() => onRemove(item.itemKey, index)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
