"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { fill } from "@/lib/format";
import { cmsImageLoader, hasVariants, lightboxUrl, type VariantSource } from "@/lib/image-variants";
import { stepIndex, swipeStep } from "../lightbox-nav";

/** What the lightbox needs of one picture. */
export interface LightboxItem extends VariantSource {
  width: number;
  height: number;
  alt: string;
  caption: string | null;
}

export interface LightboxLabels {
  dialog: string;
  previous: string;
  next: string;
  close: string;
  /** "{n} / {total}" */
  counter: string;
  /** Said to screen readers while the picture loads. */
  loading: string;
}

/**
 * The picture fills its box with `object-fit: contain`, so a click on the bars beside it still
 * hits the `img`: true when the click lies outside the picture itself.
 */
function isOutsidePicture(
  img: HTMLImageElement,
  event: React.MouseEvent,
  known: { width: number; height: number },
): boolean {
  const box = img.getBoundingClientRect();
  // Before the file has loaded the element has no natural size: the CMS's size has the same ratio.
  const w = img.naturalWidth || known.width;
  const h = img.naturalHeight || known.height;
  if (!w || !h) return false;
  const scale = Math.min(box.width / w, box.height / h);
  const width = w * scale;
  const height = h * scale;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
  return (
    event.clientX < left ||
    event.clientX > left + width ||
    event.clientY < top ||
    event.clientY > top + height
  );
}

/**
 * Makes the server-rendered grid inside it open full size. The grid is passed as children, so its
 * HTML is the same with or without this island; a click on any `[data-lightbox-index]` inside
 * opens a native modal `<dialog>` at that picture. Focus goes back to the clicked picture on close.
 */
export function Lightbox({
  items,
  labels,
  children,
}: {
  items: readonly LightboxItem[];
  labels: LightboxLabels;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  // The picture that has finished loading; the indicator shows until it is the current one.
  const [loaded, setLoaded] = useState<number | null>(null);

  const open = index !== null;
  const count = items.length;

  const step = useCallback(
    (delta: number) =>
      setIndex((current) => (current === null ? current : stepIndex(current, delta, count))),
    [count],
  );

  // The scroll of the page behind is locked while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);

  // The neighbours are fetched ahead, from the very address the dialog will use for them, so a
  // step shows them from the browser's cache.
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const at of [stepIndex(index, 1, count), stepIndex(index, -1, count)]) {
      const neighbour = items[at];
      if (!neighbour) continue;
      const href = hasVariants(neighbour)
        ? lightboxUrl(neighbour, window.innerWidth, window.devicePixelRatio)
        : neighbour.url;
      // A request the browser keeps in its cache for the picture that will use it.
      if (href) new window.Image().src = href;
    }
  }, [index, count, items]);

  const show = (target: HTMLElement, at: number) => {
    opener.current = target;
    setIndex(at);
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  };

  const onGridClick = (event: React.MouseEvent) => {
    const target = (event.target as Element).closest<HTMLElement>("[data-lightbox-index]");
    if (!target) return;
    const at = Number(target.dataset.lightboxIndex);
    if (Number.isInteger(at) && at >= 0 && at < count) show(target, at);
  };

  // Called by Escape too: the native dialog is already closed then.
  const onClosed = () => {
    setIndex(null);
    setLoaded(null);
    opener.current?.focus();
    opener.current = null;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    const point = event.touches[0];
    touch.current = point ? { x: point.clientX, y: point.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    const point = event.changedTouches[0];
    touch.current = null;
    if (!start || !point) return;
    const delta = swipeStep(point.clientX - start.x, point.clientY - start.y);
    if (delta !== 0) step(delta);
  };

  const item = index === null ? null : items[index];
  const variants = item ? hasVariants(item) : false;

  return (
    <>
      {/* The wrapper adds no box: the grid lays out exactly as it did without it. */}
      <div style={{ display: "contents" }} onClick={onGridClick}>
        {children}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={labels.dialog}
        onClose={onClosed}
        onKeyDown={onKeyDown}
        onClick={(event) => {
          // The empty ground around the picture is the backdrop.
          const target = event.target as HTMLElement;
          if (target instanceof HTMLImageElement && item && isOutsidePicture(target, event, item)) {
            event.currentTarget.close();
            return;
          }
          if (
            target === event.currentTarget ||
            target.classList.contains("lb-panel") ||
            target.classList.contains("lb-figure")
          )
            event.currentTarget.close();
        }}
      >
        {item && index !== null ? (
          <div className="lb-panel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <figure className="lb-figure">
              <Image
                key={index}
                src={item.url}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes="100vw"
                // The CMS's ready variant for the width asked; a vector or unprocessed picture as it is.
                {...(variants ? { loader: cmsImageLoader(item) } : { unoptimized: true })}
                className="lb-img"
                priority
                onLoad={() => setLoaded(index)}
              />
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>
            {loaded !== index ? (
              <span className="lb-spinner" role="status" aria-label={labels.loading} />
            ) : null}
            <p className="lb-counter" aria-live="polite">
              {fill(labels.counter, { n: index + 1, total: count })}
            </p>
            <button
              type="button"
              className="lb-btn lb-close"
              aria-label={labels.close}
              onClick={() => dialog.current?.close()}
            >
              <span aria-hidden="true">✕</span>
            </button>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  className="lb-btn lb-prev"
                  aria-label={labels.previous}
                  onClick={() => step(-1)}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  className="lb-btn lb-next"
                  aria-label={labels.next}
                  onClick={() => step(1)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
