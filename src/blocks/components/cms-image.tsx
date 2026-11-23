import { getImageProps } from "next/image";
import type { PublicImage } from "@probiz/sdk";
import type { CSSProperties } from "react";
import { cmsImageLoader, hasVariants, placeholderOf, truthfulSrcSet } from "@/lib/image-variants";

/** Where a cropped picture keeps its focus: the CMS's focal point as `object-position`. */
export const objectPositionOf = (image: Pick<PublicImage, "focalPoint">): string =>
  `${Math.round(image.focalPoint.x * 100)}% ${Math.round(image.focalPoint.y * 100)}%`;

/**
 * A picture from the CMS through `next/image`, with its real size (so there is no layout shift)
 * and the `sizes` the layout gives it. `next/image` only builds the attributes: its loader
 * returns the CMS's ready WEBP variant for each width (lib/image-variants.ts), so the site's
 * server never resizes a picture and the browser loads it from the media origin. A vector
 * picture, or one the CMS has not processed yet, is shown as it is (`unoptimized`). While it
 * loads, the CMS's blur placeholder (or its dominant colour) fills the box. `cover` crops to the
 * box around the image's focal point; the box must be sized by the stylesheet.
 */
export function CmsImage({
  image,
  sizes,
  priority = false,
  className,
  cover = false,
  alt,
  style: extraStyle,
}: {
  image: PublicImage | null | undefined;
  sizes: string;
  priority?: boolean;
  className?: string;
  cover?: boolean;
  /** Overrides the CMS's alt text (a decorative picture gets ""). */
  alt?: string;
  style?: CSSProperties;
}) {
  if (!image) return null;
  const placeholder = placeholderOf(image);
  const ready = hasVariants(image);
  const { props } = getImageProps({
    src: image.url,
    alt: alt ?? image.alt ?? "",
    width: image.width,
    height: image.height,
    sizes,
    priority,
    unoptimized: !ready,
    ...(ready ? { loader: cmsImageLoader(image) } : {}),
    ...(placeholder ? { placeholder: "blur" as const, blurDataURL: placeholder } : {}),
  });
  const position = objectPositionOf(image);
  const style: CSSProperties = {
    ...props.style,
    ...(!placeholder && image.dominantColor ? { backgroundColor: image.dominantColor } : {}),
    ...(placeholder ? { backgroundPosition: position } : {}),
    ...(cover ? { objectFit: "cover", objectPosition: position } : {}),
    ...extraStyle,
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the attributes come from next/image
    <img
      {...props}
      alt={props.alt}
      srcSet={truthfulSrcSet(image, props.srcSet)}
      className={className}
      style={style}
    />
  );
}
