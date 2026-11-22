import Link from "next/link";
import { PictureGrid } from "./gallery";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";

/** An album of the gallery module. Pictures only; a video of the album is a link to where it lives. */
export function GalleryEmbed({ block, ctx }: BlockProps<"galleryEmbed">) {
  const d = block.data;
  const gallery = d.gallery;
  if (!gallery) return null;
  const items = gallery.items.slice(0, d.limit ?? gallery.items.length);
  const pictures = items.flatMap((item) =>
    item.kind === "image" && item.image
      ? [{ image: item.image, caption: d.showCaptions === false ? null : item.caption }]
      : [],
  );
  const videos = items.flatMap((item) =>
    item.kind === "video" && item.video ? [{ video: item.video, caption: item.caption }] : [],
  );
  if (pictures.length === 0 && videos.length === 0) return null;
  const heading = d.heading ?? gallery.title;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={heading}>
      <SectionHead id={block.id} heading={heading} />
      {pictures.length > 0 ? (
        <PictureGrid
          pictures={pictures}
          layout={d.layout ?? "grid"}
          columns={d.columns ?? 3}
          label={heading}
          messages={ctx.messages}
        />
      ) : null}
      {videos.length > 0 ? (
        <ul className="block-empty">
          {videos.map((item) => (
            <li key={`${item.video.provider}-${item.video.id}`}>
              <a
                className="textlink"
                href={
                  item.video.provider === "youtube"
                    ? `https://www.youtube.com/watch?v=${item.video.id}`
                    : `https://vimeo.com/${item.video.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.caption ?? ctx.messages.blocks.video}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {d.linkToAlbum && gallery.href ? (
        <p>
          <Link className="textlink" href={gallery.href}>
            {ctx.messages.blocks.viewAlbum}
          </Link>
        </p>
      ) : null}
    </Section>
  );
}
