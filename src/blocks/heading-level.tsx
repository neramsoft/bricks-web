import { createElement, type ComponentProps } from "react";

/** A heading element a block may draw. */
export type HeadingTag = "h2" | "h3" | "h4";

/**
 * The element for the titles inside a block. The block's own heading is an `h2` (the page's `h1`
 * is the hero's or the page title), so its items are one level below it (`h3`), and a block
 * without a heading has its items at `h2`, never skipping a level. `depth` 2 is for a group
 * inside the items' level (the events after the next one).
 */
export function itemHeading(hasHeading: boolean, depth: 1 | 2 = 1): HeadingTag {
  const level = (hasHeading ? 2 : 1) + depth;
  return level === 2 ? "h2" : level === 3 ? "h3" : "h4";
}

/** A title inside a block: the element `itemHeading` names, with the given attributes. */
export function ItemTitle({
  hasHeading,
  depth = 1,
  ...props
}: ComponentProps<"h2"> & { hasHeading: boolean; depth?: 1 | 2 }) {
  return createElement(itemHeading(hasHeading, depth), props);
}
