import Image from "next/image";
import type { PublicImage } from "@probiz/sdk";
import type { CSSProperties } from "react";

/** Where a cropped picture keeps its focus: the CMS's focal point as `object-position`. */
export const objectPositionOf = (image: Pick<PublicImage, "focalPoint">): string =>
  `${Math.round(image.focalPoint.x * 100)}% ${Math.round(image.focalPoint.y * 100)}%`;

/** The blurred placeholder the CMS made for an image, when it is an image data address. */
const blur = (image: PublicImage): string | undefined =>
  image.placeholder?.startsWith("data:image/") ? image.placeholder : undefined;

/**
 * A picture from the CMS through `next/image`, with its real size (so there is no layout shift)
 * and the `sizes` the layout gives it. `cover` crops to the box around the image's focal point;
 * the box must be sized by the stylesheet (the image then fills it).
 */
export function CmsImage({
  image,
  sizes,
  priority = false,
  className,
  cover = false,
  alt,
}: {
  image: PublicImage | null | undefined;
  sizes: string;
  priority?: boolean;
  className?: string;
  cover?: boolean;
  /** Overrides the CMS's alt text (a decorative picture gets ""). */
  alt?: string;
}) {
  if (!image) return null;
  const placeholder = blur(image);
  const style: CSSProperties | undefined = cover
    ? { objectFit: "cover", objectPosition: objectPositionOf(image) }
    : undefined;
  return (
    <Image
      src={image.url}
      alt={alt ?? image.alt ?? ""}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      // A vector image has no sizes to choose from; the optimizer would refuse it.
      unoptimized={image.mimeType === "image/svg+xml"}
      {...(placeholder ? { placeholder: "blur" as const, blurDataURL: placeholder } : {})}
      className={className}
      style={style}
    />
  );
}
