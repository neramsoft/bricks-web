import { Buttons } from "./cms-link";
import { CmsImage } from "./cms-image";
import { RichTextView } from "./rich-text";
import { Section } from "./section";
import type { BlockProps } from "./props";

export function ImageText({ block }: BlockProps<"imageText">) {
  const d = block.data;
  const image = d.image ?? d.darkImage;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <div className={`image-text ${d.imagePosition ?? "left"}`}>
        <div className="image-text-media" data-reveal>
          <CmsImage image={image} sizes="(min-width: 901px) 46vw, 100vw" />
        </div>
        <div>
          {d.heading ? (
            <h2 className="h-section" id={`${block.id}-h`} data-reveal>
              {d.heading}
            </h2>
          ) : null}
          <RichTextView content={d.content} sizes="(min-width: 901px) 46vw, 100vw" />
          <Buttons buttons={d.buttons} />
        </div>
      </div>
    </Section>
  );
}
