import Link from "next/link";
import { fill } from "@/lib/format";
import { CmsImage } from "./cms-image";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";

/** The albums of the gallery module as cards: the cover, the title and how many pictures. */
export function GalleryList({ block, ctx }: BlockProps<"galleryList">) {
  const d = block.data;
  const galleries = d.galleries ?? [];
  if (galleries.length === 0) return null;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
      <ul className="gal-cards">
        {galleries.map((gallery) => {
          const body = (
            <>
              <span className="gal-cover">
                <CmsImage
                  image={gallery.cover}
                  sizes="(min-width: 901px) 33vw, (min-width: 561px) 50vw, 100vw"
                  cover
                />
              </span>
              <span className="gal-card-body">
                <b>{gallery.title}</b>
                <span>{fill(ctx.messages.blocks.galleryItems, { n: gallery.count })}</span>
              </span>
            </>
          );
          return (
            <li key={gallery.id} data-reveal>
              {gallery.href ? (
                <Link className="gal-card" href={gallery.href}>
                  {body}
                </Link>
              ) : (
                <div className="gal-card">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
