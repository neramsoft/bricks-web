"use client";

import { useId, useState } from "react";
import { matches } from "./search";

/**
 * The search box of a menu. The list is already on the page, complete (the server drew it);
 * this only hides the dishes that do not match and the sections left with none, so nothing is
 * fetched. Without script the box does nothing and the whole menu stays.
 */
export function MenuSearch({
  targetId,
  label,
  placeholder,
  empty,
}: {
  targetId: string;
  label: string;
  placeholder: string;
  empty: string;
}) {
  const inputId = useId();
  const [none, setNone] = useState(false);

  function filter(query: string) {
    const root = document.getElementById(targetId);
    if (!root) return;
    let shown = 0;
    root.querySelectorAll<HTMLElement>("[data-cat]").forEach((cat) => {
      let inCat = 0;
      cat.querySelectorAll<HTMLElement>("[data-search]").forEach((item) => {
        const ok = matches(item.dataset.search ?? "", query);
        item.hidden = !ok;
        if (ok) inCat += 1;
      });
      cat.hidden = inCat === 0;
      shown += inCat;
    });
    setNone(shown === 0);
  }

  return (
    <>
      <div className="msearch">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <label className="sr-only" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          onChange={(event) => filter(event.target.value)}
        />
      </div>
      <p className="menu-empty" role="status" hidden={!none}>
        {none ? empty : ""}
      </p>
    </>
  );
}
