// CMS pictures come ready-made: the CMS stores WEBP (and AVIF) variants of every photo at fixed
// widths, on the media origin, with long-lived cache headers. The site never resizes a picture
// itself (Next's optimizer would download the original and re-encode it on every cold cache);
// the `next/image` loader below only chooses the variant. Pure, so the components and the tests
// share it.
import { pickImageVariant, type PublicImage } from "@probiz/sdk";

/** The widths the CMS makes variants at. `images.deviceSizes` in next.config.ts is the same list. */
export const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;

/** The part of a CMS image the variant choice reads. */
export type VariantSource = Pick<PublicImage, "url" | "mimeType" | "variants">;

/** What `pickImageVariant` takes: it reads `variants` only, the rest is carried along. */
const asImage = (image: VariantSource): PublicImage => image as PublicImage;

/** The WEBP variant for an element `width` px wide (smallest at least that wide, else the largest). */
export function variantUrl(image: VariantSource, width: number): string | null {
  if (image.mimeType === "image/svg+xml") return null;
  return pickImageVariant(asImage(image), width, "WEBP")?.url ?? null;
}

/** Whether the picture has variants to load; a vector picture, or one still processing, has none. */
export const hasVariants = (image: VariantSource): boolean => variantUrl(image, 1) !== null;

/**
 * A `next/image` loader for one picture: the variant for the requested width. The picture's own
 * address is only the fallback, which a caller avoids by rendering such a picture `unoptimized`.
 */
export function cmsImageLoader(image: VariantSource): (props: { width: number }) => string {
  return ({ width }) => variantUrl(image, width) ?? image.url;
}

/**
 * Next labels every `srcset` entry with the width it asked the loader for, so two requested
 * widths can name the same file and a file can be labelled wider than it is. This labels each
 * entry with its variant's real width and drops repeats.
 */
export function truthfulSrcSet(
  image: VariantSource,
  srcSet: string | undefined,
): string | undefined {
  if (!srcSet) return srcSet;
  const widthOf = new Map(
    image.variants.filter((v) => v.format === "WEBP").map((v) => [v.url, v.width] as const),
  );
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const entry of srcSet.split(",")) {
    const [url, descriptor] = entry.trim().split(/\s+/);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const real = widthOf.get(url);
    entries.push(real && descriptor?.endsWith("w") ? `${url} ${real}w` : entry.trim());
  }
  return entries.join(", ");
}

/**
 * The file the lightbox's picture will load in a window `cssWidth` px wide at `pixelRatio`
 * (the picture is `sizes="100vw"`): what to preload for its neighbours. It is the file the
 * browser picks from the picture's `srcset`, so the preload is the cache entry the picture uses.
 */
export function lightboxUrl(
  image: VariantSource,
  cssWidth: number,
  pixelRatio: number,
): string | null {
  return variantUrl(image, Math.ceil(cssWidth * Math.max(1, pixelRatio)));
}

/** A small CMS picture (a logo) at a fixed layout width: its variant for a 2x screen, or the picture. */
export function logoSource(image: VariantSource, cssWidth: number): string {
  return variantUrl(image, cssWidth * 2) ?? image.url;
}

/** A CMS blur placeholder, when it is an image data address. */
export const placeholderOf = (image: Pick<PublicImage, "placeholder">): string | undefined =>
  image.placeholder?.startsWith("data:image/") ? image.placeholder : undefined;
