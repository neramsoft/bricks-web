import type { ReactNode } from "react";
import { ContactForm } from "./components/contact-form";
import { ContactInfo } from "./components/contact-info";
import { EventList } from "./components/event-list";
import { Features } from "./components/features";
import { Gallery } from "./components/gallery";
import { GalleryEmbed } from "./components/gallery-embed";
import { GalleryList } from "./components/gallery-list";
import { Hero } from "./components/hero";
import { ImageBlock } from "./components/image-block";
import { ImageText } from "./components/image-text";
import { LocationList } from "./components/location-list";
import { MapBlock, PlacePanel } from "./components/map-block";
import { HoursPanel, OpeningHours } from "./components/opening-hours";
import type { BlockContext } from "./components/props";
import { RestaurantMenu } from "./components/restaurant-menu";
import { RestaurantMenuList } from "./components/restaurant-menu-list";
import { RichTextBlock } from "./components/rich-text-block";
import { Section } from "./components/section";
import { Showcase } from "./components/showcase";
import { Statement } from "./components/statement";
import { parseBlocks } from "./parse";
import type { ParsedBlock } from "./types";

// One component per block type of @probiz/blocks that this site draws. A block of any other type
// never gets here (parseBlocks leaves it out with a warning), and one that does reach `Render`
// without a component draws nothing: the page never breaks over a block.

function Render({ block, ctx }: { block: ParsedBlock; ctx: BlockContext }): ReactNode {
  switch (block.type) {
    case "hero":
      return <Hero block={block} ctx={ctx} />;
    case "statement":
      return <Statement block={block} ctx={ctx} />;
    case "richText":
      return <RichTextBlock block={block} ctx={ctx} />;
    case "image":
      return <ImageBlock block={block} ctx={ctx} />;
    case "imageText":
      return <ImageText block={block} ctx={ctx} />;
    case "features":
      return <Features block={block} ctx={ctx} />;
    case "showcase":
      return <Showcase block={block} ctx={ctx} />;
    case "gallery":
      return <Gallery block={block} ctx={ctx} />;
    case "galleryEmbed":
      return <GalleryEmbed block={block} ctx={ctx} />;
    case "galleryList":
      return <GalleryList block={block} ctx={ctx} />;
    case "contactInfo":
      return <ContactInfo block={block} ctx={ctx} />;
    case "openingHours":
      return <OpeningHours block={block} ctx={ctx} />;
    case "map":
      return <MapBlock block={block} ctx={ctx} />;
    case "restaurantMenu":
      return <RestaurantMenu block={block} ctx={ctx} />;
    case "restaurantMenuList":
      return <RestaurantMenuList block={block} ctx={ctx} />;
    case "eventList":
      return <EventList block={block} ctx={ctx} />;
    case "locationList":
      return <LocationList block={block} ctx={ctx} />;
    case "contactForm":
      return <ContactForm block={block} ctx={ctx} />;
    default:
      return null;
  }
}

type Page = Omit<BlockContext, "lead" | "menuIndex">;

/**
 * Draws the blocks that passed the check, in order. A map next to the opening hours is one
 * two-column panel (the prototype's "Gdje smo"), whichever comes first.
 */
export function Blocks({ blocks, page }: { blocks: readonly ParsedBlock[]; page: Page }) {
  let menus = 0;
  const out: ReactNode[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const next = blocks[index + 1];
    const ctx: BlockContext = {
      ...page,
      lead: index === 0,
      menuIndex: block.type === "restaurantMenu" ? menus : 0,
    };
    if (block.type === "restaurantMenu") menus += 1;
    const pair =
      next &&
      ((block.type === "map" && next.type === "openingHours") ||
        (block.type === "openingHours" && next.type === "map"));
    if (pair && next) {
      const map = block.type === "map" ? block : next;
      const hours = block.type === "openingHours" ? block : next;
      if (map.type === "map" && hours.type === "openingHours" && hours.data.hours?.weekly.length) {
        out.push(
          <Section key={block.id} id={block.id} anchorId={null} className="locate">
            <div className="panel-grid">
              {block.type === "map" ? (
                <>
                  <PlacePanel id={map.id} anchorId={map.anchorId} data={map.data} ctx={ctx} />
                  <HoursPanel id={hours.id} anchorId={hours.anchorId} data={hours.data} ctx={ctx} />
                </>
              ) : (
                <>
                  <HoursPanel id={hours.id} anchorId={hours.anchorId} data={hours.data} ctx={ctx} />
                  <PlacePanel id={map.id} anchorId={map.anchorId} data={map.data} ctx={ctx} />
                </>
              )}
            </div>
          </Section>,
        );
        index += 1;
        continue;
      }
    }
    out.push(<Render key={block.id} block={block} ctx={ctx} />);
  }
  return <>{out}</>;
}

export { parseBlocks };
