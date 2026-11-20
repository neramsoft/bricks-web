"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { fill, formatMoney } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import {
  MAX_NOTE,
  cartReducer,
  countOf,
  itemIndex,
  orderBody,
  parseLines,
  reconcile,
  totalCents,
} from "./cart";
import { CartSheet } from "./cart-sheet";
import { describeFailure, failureOf } from "./errors";
import { createGuestApi, type GuestApi } from "./guest-api";
import { OrderMenu } from "./order-menu";
import { browserStorage, forgetOrder, openOrderOf, saveOrder } from "./secrets";
import { StatusSheet, type TrackedOrder } from "./status-sheet";
import { isFinal } from "./status";
import type { OrderingPage, PlacedOrder } from "./types";
import { watchOrder } from "./watch";

export interface OrderAppProps {
  page: OrderingPage;
  token: string;
  /** The API's address as this browser reaches it (PUBLIC_API_URL, handed over by the server). */
  publicApiUrl: string;
  messages: Messages["ordering"];
  /** Count words and "open/closed" lines, drawn by the server. */
  venueLine: string | null;
  languages: Array<{ code: string; name: string; href: string }>;
  logo: { src: string; width: number; height: number; unoptimized: boolean };
  homeHref: string;
}

const TOAST_MS = 2600;
const draftKey = (token: string) => `bricks.cart.${token.toLowerCase()}`;

function sessionStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function OrderApp({
  page,
  token,
  publicApiUrl,
  messages,
  venueLine,
  languages,
  logo,
  homeHref,
}: OrderAppProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const api: GuestApi = useMemo(() => createGuestApi(publicApiUrl), [publicApiUrl]);
  const items = useMemo(() => itemIndex(page), [page]);

  const [lines, dispatch] = useReducer(cartReducer, []);
  const [draft, setDraft] = useReducer(
    (
      state: { note: string; ready: boolean },
      change: Partial<{ note: string; ready: boolean }>,
    ) => ({
      ...state,
      ...change,
    }),
    { note: "", ready: false },
  );
  const { note, ready } = draft;
  const setNote = useCallback((value: string) => setDraft({ note: value }), []);
  const [sheet, setSheet] = useState<"cart" | "status" | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set());
  const [tracked, setTracked] = useState<TrackedOrder | null>(null);
  const [closedNow, setClosedNow] = useState(false);
  const [callsOff, setCallsOff] = useState(false);
  const [calling, setCalling] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const closed = !page.venue.openNow || closedNow;
  const callsOn = page.callsEnabled && !callsOff;
  const failureTexts = useMemo(() => messages.errors, [messages]);

  const showToast = useCallback((text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ text, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // Restores the basket of this tab (a language switch or a reload keeps it) and resumes the open
  // order of this table, if the browser still holds its secret.
  useEffect(() => {
    const store = sessionStore();
    try {
      const raw = store?.getItem(draftKey(token));
      if (raw) {
        const saved = JSON.parse(raw) as { lines?: unknown; note?: unknown };
        const restored = reconcile(parseLines(saved.lines), items);
        if (restored.lines.length > 0) dispatch({ type: "set", lines: restored.lines });
        if (typeof saved.note === "string") setDraft({ note: saved.note.slice(0, MAX_NOTE) });
      }
    } catch {
      // No draft.
    }
    const stored = openOrderOf(browserStorage(), token);
    if (stored) {
      void api
        .getOrder(stored.orderId, stored.secret)
        .then((order) => {
          if (isFinal(order.status)) {
            forgetOrder(browserStorage(), stored.orderId);
            return;
          }
          setTracked({ order, secret: stored.secret, polling: false });
          setSheet("status");
        })
        .catch((failure) => {
          // Gone (wrong secret, cleared order): forget it. A network failure keeps it for next time.
          if (failureOf(failure).kind === "order_gone")
            forgetOrder(browserStorage(), stored.orderId);
        });
    }
    setDraft({ ready: true });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The menu was read again (a price changed): what is not on it any more leaves the basket.
  const firstItems = useRef(items);
  useEffect(() => {
    if (firstItems.current === items) return;
    firstItems.current = items;
    const next = reconcile(lines, items);
    if (next.dropped > 0 || next.lines.length !== lines.length) {
      dispatch({ type: "set", lines: next.lines });
    }
    setFlagged(new Set());
    // `lines` is read once per new menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (!ready) return;
    try {
      const store = sessionStore();
      if (lines.length === 0 && note === "") store?.removeItem(draftKey(token));
      else store?.setItem(draftKey(token), JSON.stringify({ lines, note }));
    } catch {
      // The basket just does not survive a reload.
    }
  }, [lines, note, ready, token]);

  // Follows the open order until it is paid or cancelled.
  const trackedId = tracked?.order.id;
  const trackedSecret = tracked?.secret;
  const trackedFinal = tracked ? isFinal(tracked.order.status) : false;
  useEffect(() => {
    if (!trackedId || !trackedSecret || trackedFinal) return;
    return watchOrder(
      api,
      { id: trackedId, secret: trackedSecret },
      {
        onOrder: (order: PlacedOrder) => {
          setTracked((current) =>
            current && current.order.id === order.id ? { ...current, order } : current,
          );
          if (isFinal(order.status)) forgetOrder(browserStorage(), order.id);
        },
        onGone: () => {
          forgetOrder(browserStorage(), trackedId);
          setTracked(null);
          setSheet(null);
          showToast(messages.errors.orderGone);
        },
        onFallback: () =>
          setTracked((current) =>
            current && current.order.id === trackedId ? { ...current, polling: true } : current,
          ),
      },
    );
  }, [api, trackedId, trackedSecret, trackedFinal, messages, showToast]);

  const money = (cents: number) => formatMoney(cents, page.currency, page.locale);
  const count = countOf(lines);
  const total = totalCents(lines, items);

  const place = async () => {
    if (placing || lines.length === 0 || closed) return;
    setPlacing(true);
    setError(null);
    setFlagged(new Set());
    try {
      const placed = await api.placeOrder(token, orderBody(lines, items, note, page.locale));
      saveOrder(browserStorage(), {
        orderId: placed.order.id,
        token,
        secret: placed.guestSecret,
        number: placed.order.number,
      });
      setTracked({ order: placed.order, secret: placed.guestSecret, polling: false });
      dispatch({ type: "clear" });
      setNote("");
      setSheet("status");
    } catch (thrown) {
      const failure = failureOf(thrown);
      setError(describeFailure(failure, failureTexts));
      if (failure.kind === "item_unavailable") setFlagged(new Set(failure.itemKeys));
      if (failure.kind === "closed") setClosedNow(true);
      if (failure.kind === "price_changed") startTransition(() => router.refresh());
    } finally {
      setPlacing(false);
    }
  };

  const call = async () => {
    if (calling) return;
    setCalling(true);
    try {
      const result = await api.callWaiter(token);
      showToast(
        result.alreadyOpen
          ? messages.waiterAlreadyCalled
          : fill(messages.waiterCalled, { number: page.table.number }),
      );
    } catch (thrown) {
      const failure = failureOf(thrown);
      if (failure.kind === "calls_disabled") setCallsOff(true);
      showToast(describeFailure(failure, failureTexts));
    } finally {
      setCalling(false);
    }
  };

  const closeSheet = () => {
    setSheet(null);
    setError(null);
    // A paid or cancelled order has said everything it had to say.
    setTracked((current) => (current && isFinal(current.order.status) ? null : current));
  };

  const seatsForm = new Intl.PluralRules(page.locale).select(page.table.seats);
  const seats = fill(
    seatsForm === "one"
      ? messages.seatsOne
      : seatsForm === "few"
        ? messages.seatsFew
        : messages.seatsMany,
    { n: page.table.seats },
  );
  const countForm = new Intl.PluralRules(page.locale).select(count);
  const countText = fill(
    countForm === "one"
      ? messages.itemsOne
      : countForm === "few"
        ? messages.itemsFew
        : messages.itemsMany,
    { n: count },
  );
  const [titleBefore = "", titleAfter = ""] = messages.tableTitle.split("{number}");
  const meta = fill(messages.tableMeta, { section: page.table.section, seats });
  const trackedStatus = tracked?.order.status;
  const barMode = count > 0 ? "cart" : tracked ? "order" : null;

  return (
    <>
      <div className="ord-phone" inert={sheet !== null}>
        <header className="ord-top">
          <a href={homeHref} aria-label="Bricks">
            <Image
              src={logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              sizes="90px"
              priority
              unoptimized={logo.unoptimized}
              style={{ height: 30, width: "auto" }}
            />
          </a>
          <div className="ord-top-actions">
            {languages.length > 0 ? (
              <ul className="ord-langs">
                {languages.map((language) => (
                  <li key={language.code}>
                    <a
                      href={language.href}
                      hrefLang={language.code}
                      lang={language.code}
                      aria-label={language.name}
                    >
                      {language.code.toUpperCase()}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {callsOn ? (
              <button type="button" className="ord-call" disabled={calling} onClick={call}>
                {messages.callWaiter}
              </button>
            ) : null}
          </div>
        </header>
        <div className="ord-table">
          <h1>
            {titleBefore}
            <b>{page.table.number}</b>
            {titleAfter}
          </h1>
          <p>{meta}</p>
          <p className="ord-venue" data-open={!closed}>
            {page.venue.name}
            {venueLine ? ` · ${venueLine}` : ""}
          </p>
          {closed ? <p className="ord-closed">{messages.closedNotice}</p> : null}
        </div>
        <OrderMenu
          page={page}
          lines={lines}
          disabled={closed}
          messages={messages}
          onAdd={(itemKey, priceIndex) => dispatch({ type: "add", itemKey, priceIndex })}
          onRemove={(itemKey, priceIndex) => dispatch({ type: "remove", itemKey, priceIndex })}
        />
        <div className="ord-spacer" />
      </div>

      {barMode ? (
        <div className="ord-bar" inert={sheet !== null}>
          <button type="button" onClick={() => setSheet(barMode === "cart" ? "cart" : "status")}>
            {barMode === "cart" ? (
              <>
                <span>
                  {countText} · {money(total)}
                </span>
                <b>{messages.viewOrder}</b>
              </>
            ) : (
              <>
                <span>
                  #{tracked?.order.number} ·{" "}
                  {trackedStatus ? messages.statusTitle[trackedStatus] : ""}
                </span>
                <b>{messages.orderNumber}</b>
              </>
            )}
          </button>
        </div>
      ) : null}

      {sheet === "cart" ? (
        <CartSheet
          page={page}
          items={items}
          lines={lines}
          note={note}
          total={total}
          flagged={flagged}
          error={error}
          placing={placing}
          closed={closed}
          messages={messages}
          onNote={setNote}
          onAdd={(itemKey, priceIndex) => dispatch({ type: "add", itemKey, priceIndex })}
          onRemove={(itemKey, priceIndex) => dispatch({ type: "remove", itemKey, priceIndex })}
          onPlace={place}
          onClose={closeSheet}
        />
      ) : null}
      {sheet === "status" && tracked ? (
        <StatusSheet
          page={page}
          tracked={tracked}
          messages={messages}
          onOrderMore={closeSheet}
          onCall={callsOn ? call : null}
          onClose={closeSheet}
        />
      ) : null}

      <div
        className="ord-toast"
        data-on={toast !== null}
        role="status"
        aria-live="polite"
        aria-label={messages.toastRegion}
      >
        {toast?.text}
      </div>
    </>
  );
}
