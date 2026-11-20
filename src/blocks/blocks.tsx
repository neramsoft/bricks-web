import type { ReactNode } from "react";
import { richTextToPlain, type RichText } from "@probiz/sdk";
import { parseBlocks } from "./parse";
import type { ParsedBlock } from "./types";

// One component per block type of @probiz/blocks. The real components (and the design) come with
// feature/theme-and-blocks; until then every block type is drawn by `Generic`, a section that
// names its type and shows the heading and text when it has them. A block of a type this site has
// no component for never gets here: parseBlocks leaves it out.

const isString = (value: unknown): value is string => typeof value === "string" && value !== "";
const isRichText = (value: unknown): value is RichText =>
  typeof value === "object" && value !== null && (value as { type?: unknown }).type === "doc";

function Generic({ block }: { block: ParsedBlock }): ReactNode {
  const { heading, text, content } = block.data;
  // The page's `h1` is the hero's headline when the page opens with one (components/page-view.tsx).
  const Heading = block.type === "hero" ? "h1" : "h2";
  const body = isString(text) ? text : isRichText(content) ? richTextToPlain(content) : null;
  return (
    <section data-block={block.type} id={block.anchorId ?? undefined}>
      {isString(heading) ? <Heading>{heading}</Heading> : null}
      {body ? <p>{body}</p> : null}
    </section>
  );
}

function Render({ block }: { block: ParsedBlock }): ReactNode {
  switch (block.type) {
    default:
      return <Generic block={block} />;
  }
}

/** Draws the blocks that passed the check, in order. */
export function Blocks({ blocks }: { blocks: readonly ParsedBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <Render key={block.id} block={block} />
      ))}
    </>
  );
}

export { parseBlocks };
