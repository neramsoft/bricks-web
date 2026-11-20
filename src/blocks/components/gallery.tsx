import type { CSSProperties } from "react";
import type { PublicImage } from "@probiz/sdk";
import { CmsImage } from "./cms-image";
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
}: {
  label?: string | undefined;
  pictures: readonly GalleryPicture[];
  layout: "grid" | "masonry" | "carousel";
  columns: number;
}) {
  const sizes =
    layout === "carousel"
      ? "(min-width: 421px) 420px, 78vw"
      : `(min-width: 861px) ${Math.round(100 / (layout === "masonry" ? 4 : columns))}vw, 50vw`;
  return (
    <div
      className={`gal-grid ${layout}`}
      style={{ "--cols": layout === "masonry" ? 4 : columns } as CSSProperties}
      {...(layout === "carousel" && label
        ? { tabIndex: 0, role: "group", "aria-label": label }
        : {})}
    >
      {pictures.map((picture, index) =>
        picture.image ? (
          <figure key={index} className="ph" data-reveal>
            <CmsImage image={picture.image} sizes={sizes} cover />
            {picture.caption ? <figcaption>{picture.caption}</figcaption> : null}
          </figure>
        ) : null,
      )}
    </div>
  );
}

export function Gallery({ block }: BlockProps<"gallery">) {
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
      />
    </Section>
  );
}
