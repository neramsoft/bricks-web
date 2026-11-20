import { RichTextView } from "./rich-text";
import { Section } from "./section";
import type { BlockProps } from "./props";

export function RichTextBlock({ block }: BlockProps<"richText">) {
  const d = block.data;
  const width = d.width ?? "normal";
  return (
    <Section id={block.id} anchorId={block.anchorId}>
      <RichTextView
        content={d.content}
        className={width === "normal" ? "prose" : `prose prose-${width}`}
        sizes="(min-width: 1024px) 720px, 100vw"
      />
    </Section>
  );
}
