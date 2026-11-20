import { isFinal } from "./status";
import type { GuestApi } from "./guest-api";
import type { PlacedOrder } from "./types";

export const POLL_MS = 10_000;

export interface WatchHandlers {
  onOrder(order: PlacedOrder): void;
  /** The API says the order is not there (or the secret is wrong): stop. */
  onGone(): void;
  /** The stream could not be read: the order is now checked by polling. */
  onFallback?(): void;
}

/**
 * Follows an order until it is paid or cancelled: the event stream first (it says each change; the
 * full order, with a cancel reason, is read when the status changes), and when the stream cannot
 * be read, `GET /orders/:id` every 10 seconds. Returns what stops it.
 */
export function watchOrder(
  api: GuestApi,
  order: { id: string; secret: string },
  handlers: WatchHandlers,
  options: { pollMs?: number; setTimer?: typeof setTimeout; clearTimer?: typeof clearTimeout } = {},
): () => void {
  const pollMs = options.pollMs ?? POLL_MS;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const controller = new AbortController();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: string | null = null;

  const stop = () => {
    stopped = true;
    controller.abort();
    if (timer !== undefined) clearTimer(timer);
  };

  const read = async (): Promise<boolean> => {
    try {
      const current = await api.getOrder(order.id, order.secret);
      if (stopped) return true;
      last = current.status;
      handlers.onOrder(current);
      if (isFinal(current.status)) stop();
      return true;
    } catch (error) {
      if (stopped) return true;
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { status?: number }).status === 404
      ) {
        handlers.onGone();
        stop();
        return true;
      }
      return false;
    }
  };

  const poll = async () => {
    if (stopped) return;
    await read();
    if (!stopped) timer = setTimer(poll, pollMs);
  };

  void (async () => {
    try {
      await api.streamOrder(
        order.id,
        order.secret,
        (status) => {
          if (status === last) return;
          last = status;
          void read().then((ok) => {
            if (!ok) last = null;
          });
        },
        controller.signal,
      );
    } catch {
      // Falls through to polling below.
    }
    if (stopped) return;
    // The stream ended: after a final status there is nothing more, otherwise it was cut.
    if (last !== null && isFinal(last as PlacedOrder["status"])) return;
    handlers.onFallback?.();
    await poll();
  })();

  return stop;
}
