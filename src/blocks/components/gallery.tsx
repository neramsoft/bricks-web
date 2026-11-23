import type { CSSProperties } from "react";
import type { PublicImage } from "@probiz/sdk";
import { fill } from "@/lib/format";
import type { Messages } from "@/lib/messages";
import { CmsImage } from "./cms-image";
import { Lightbox, type LightboxItem } from "./lightbox";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";

export interface GalleryPicture {
  image: PublicImage | null;
  caption?: string | null;
}

/** The pictures of a gallery in the layout the block asks for; the masonry is the prototype's brick wall. */
export function PictureGrid({
  pictures,
  layout,
  columns,
  label,
  messages,
}: {
  messages: Messages;
  label?: string | undefined;
  pictures: readonly GalleryPicture[];
  layout: "grid" | "masonry" | "carousel";
  columns: number;
}) {
  const sizes =
    layout === "carousel"
      ? "(min-width: 421px) 420px, 78vw"
      : `(min-width: 861px) ${Math.round(100 / (layout === "masonry" ? 4 : columns))}vw, 50vw`;
  const shown = pictures.flatMap((picture) =>
    picture.image ? [{ image: picture.image, caption: picture.caption ?? null }] : [],
  );
  const items: LightboxItem[] = shown.map(({ image, caption }) => ({
    url: image.url,
    mimeType: image.mimeType,
    // Only the WEBP variants are loaded; the dialog's page payload need not carry the AVIF ones.
    variants: image.variants.filter((variant) => variant.format === "WEBP"),
    width: image.width,
    height: image.height,
    alt: image.alt ?? "",
    caption,
  }));
  const text = messages.lightbox;
  return (
    <Lightbox
      items={items}
      labels={{
        dialog: text.dialog,
        previous: text.previous,
        next: text.next,
        close: text.close,
        counter: text.counter,
        loading: text.loading,
      }}
    >
      <div
        className={`gal-grid ${layout}`}
        style={{ "--cols": layout === "masonry" ? 4 : columns } as CSSProperties}
        {...(layout === "carousel" && label
          ? { tabIndex: 0, role: "group", "aria-label": label }
          : {})}
      >
        {shown.map(({ image, caption }, index) => (
          <figure key={index} className="ph" data-reveal>
            <button
              type="button"
              className="ph-open"
              data-lightbox-index={index}
              aria-label={
                image.alt
                  ? fill(text.open, { alt: image.alt })
                  : caption
                    ? fill(text.open, { alt: caption })
                    : text.openUntitled
              }
            >
              <CmsImage image={image} sizes={sizes} cover />
            </button>
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </Lightbox>
  );
}

export function Gallery({ block, ctx }: BlockProps<"gallery">) {
  const d = block.data;
  const pictures = d.items.map((item) => ({ image: item.image ?? null, caption: item.caption }));
  if (pictures.every((picture) => !picture.image)) return null;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
      <PictureGrid
        pictures={pictures}
        layout={d.layout ?? "grid"}
        columns={d.columns ?? 3}
        label={d.heading}
        messages={ctx.messages}
      />
    </Section>
  );
}
