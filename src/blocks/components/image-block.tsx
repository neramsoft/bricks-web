import { CmsImage } from "./cms-image";
import { CmsLink } from "./cms-link";
import { Section } from "./section";
import type { BlockProps } from "./props";

const SIZES = {
  normal: "(min-width: 1000px) 960px, 100vw",
  wide: "(min-width: 1320px) 1280px, 100vw",
  full: "100vw",
} as const;

export function ImageBlock({ block, ctx }: BlockProps<"image">) {
  const d = block.data;
  const image = d.image ?? d.darkImage;
  if (!image) return null;
  const size = d.size ?? "normal";
  const picture = <CmsImage image={image} sizes={SIZES[size]} priority={ctx.lead} />;
  return (
    <Section id={block.id} anchorId={block.anchorId} wrap={size !== "full"}>
      <figure className={`figure ${size}`}>
        {d.link ? <CmsLink link={d.link}>{picture}</CmsLink> : picture}
        {d.caption ? <figcaption>{d.caption}</figcaption> : null}
      </figure>
    </Section>
  );
}
