import type {
  ApiComponents,
  BlockData,
  BlockType,
  Button,
  Link,
  PublicContactInfo,
  PublicFormCaptcha,
  PublicImage,
  RichText,
  VideoSource,
} from "@probiz/sdk";

// What a block's `data` looks like in the public answer: the stored data (typed by @probiz/blocks)
// with what the API resolved next to it: the `image` beside a `mediaId` (`darkImage` beside
// `darkMediaId`), the `href` of every link, and the records of the module blocks. One entry per
// block type this site draws; any other type is left out by blocks/parse.ts and never gets here.

type Schemas = ApiComponents["schemas"];

export type Img = PublicImage | null;
/** A link as the public answer has it: `href` is null when the target is not live. */
export type ResolvedLink = Link & { href?: string | null };
export type ResolvedButton = Omit<Button, "link"> & { link: ResolvedLink };

interface Media {
  image?: Img;
  darkImage?: Img;
}
type Items<D, I> = Omit<D, "items"> & { items: I[] };
type Item<D extends { items: unknown[] }> = D["items"][number];
type Data<T extends BlockType> = BlockData<T>;

/** One picture or video of an album; a video is a YouTube or Vimeo id. */
export interface ResolvedGalleryItem {
  kind: "image" | "video";
  image: Img;
  video: { provider: "youtube" | "vimeo"; id: string } | null;
  caption: string | null;
}

/** The album a `galleryEmbed` block shows. */
export interface ResolvedGallery {
  id: string;
  title: string;
  /** The album's own page; null when detail pages are off. */
  href: string | null;
  items: ResolvedGalleryItem[];
}

/** An album as a card of the `galleryList` block. */
export interface ResolvedGalleryCard {
  id: string;
  title: string;
  href: string | null;
  cover: Img;
  date: string | null;
  /** Every item of the album, videos included. */
  count: number;
}

/** A location as the `locationList` block's `data.locations` holds it. `openNow` and `todayHours` are null with `showHours: false` or without hours. */
export interface ResolvedLocation {
  id: string;
  name: string;
  /** The detail page; null when detail pages are off. */
  href: string | null;
  address: { street: string; postalCode: string | null; city: string; country: string };
  phone: string | null;
  email: string | null;
  image: Img;
  openNow: boolean | null;
  todayHours: Schemas["PublicTodayHours"] | null;
  primary: boolean;
}

/** The menu a `restaurantMenu` block shows: the sections in the block's order. */
export interface ResolvedMenu {
  id: string;
  title: string;
  summary: string | null;
  /** The menu's own page; null when detail pages are off. */
  href: string | null;
  image: Img;
  note: RichText | null;
  availability: Schemas["PublicOpeningHours"] | null;
  validFrom: string | null;
  validUntil: string | null;
  validity: Schemas["RestaurantMenuValidity"];
  /** Null while prices are hidden. */
  currency: string | null;
  showPrices: boolean;
  allergenNote: string | null;
  sections: Schemas["PublicRestaurantMenuSection"][];
}

export interface RenderData {
  hero: Omit<Data<"hero">, "buttons" | "video" | "tabs"> &
    Media & {
      buttons: ResolvedButton[];
    };
  statement: Omit<Data<"statement">, "link"> & { link?: ResolvedLink };
  richText: Data<"richText">;
  image: Omit<Data<"image">, "link"> & Media & { link?: ResolvedLink };
  imageText: Omit<Data<"imageText">, "buttons"> & Media & { buttons: ResolvedButton[] };
  gallery: Items<Data<"gallery">, Item<Data<"gallery">> & { image?: Img }>;
  showcase: Items<Data<"showcase">, Item<Data<"showcase">> & Media>;
  features: Items<
    Data<"features">,
    Omit<Item<Data<"features">>, "link"> & Media & { link?: ResolvedLink }
  >;
  contactForm: Data<"contactForm">;
  map: Data<"map">;
  openingHours: Data<"openingHours"> & { hours?: Schemas["PublicOpeningHours"] };
  contactInfo: Data<"contactInfo"> & { info?: PublicContactInfo };
  galleryEmbed: Data<"galleryEmbed"> & { gallery?: ResolvedGallery | null };
  galleryList: Data<"galleryList"> & { galleries?: ResolvedGalleryCard[] };
  locationList: Data<"locationList"> & { locations?: ResolvedLocation[] };
  eventList: Data<"eventList"> & { events?: Schemas["PublicEventSummary"][] };
  restaurantMenu: Data<"restaurantMenu"> & { menu?: ResolvedMenu | null };
  restaurantMenuList: Data<"restaurantMenuList"> & {
    menus?: Schemas["PublicRestaurantMenuSummary"][];
  };
}

/** A block that passed the check and is ready to draw. */
export type ParsedBlock =
  | {
      [T in keyof RenderData]: {
        id: string;
        type: T;
        anchorId: string | null;
        data: RenderData[T];
      };
    }[keyof RenderData]
  | {
      id: string;
      type: Exclude<BlockType, keyof RenderData>;
      anchorId: string | null;
      data: Record<string, unknown>;
    };

export type { PublicFormCaptcha, RichText, VideoSource };
