import type { CSSProperties } from "react";
import { CmsImage } from "./cms-image";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";

/** A row of pictures with a name and a line each ("what is poured at Bricks": drink, price). No script: every item is on the page. */
export function Showcase({ block }: BlockProps<"showcase">) {
  const d = block.data;
  const items = d.items.filter((item) => item.image ?? item.darkImage);
  if (items.length === 0) return null;
  const sizes = `(min-width: 761px) ${Math.round(100 / Math.min(items.length, 4))}vw, 100vw`;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
      <div className="showcase" style={{ "--n": Math.min(items.length, 4) } as CSSProperties}>
        {items.map((item, index) => (
          <figure key={index} data-reveal>
            <CmsImage image={item.image ?? item.darkImage} sizes={sizes} cover />
            <figcaption>
              <b>{item.label}</b>
              {item.caption ? <span>{item.caption}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
