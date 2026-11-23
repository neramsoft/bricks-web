import { describe, expect, it } from "vitest";
import {
  cmsImageLoader,
  hasVariants,
  lightboxUrl,
  logoSource,
  placeholderOf,
  truthfulSrcSet,
  VARIANT_WIDTHS,
  type VariantSource,
} from "./image-variants";

const base = "https://media.bricks.ba/media/abc/hash";
const variants = (widths: readonly number[]): VariantSource["variants"] =>
  (["WEBP", "AVIF"] as const).flatMap((format) =>
    widths.map((width) => ({
      width,
      height: Math.round(width * 0.75),
      format,
      url: `${base}/w${width}.${format.toLowerCase()}`,
    })),
  );

const photo: VariantSource = {
  url: `${base}/original.jpg`,
  mimeType: "image/jpeg",
  variants: variants(VARIANT_WIDTHS),
};
const w = (width: number) => `${base}/w${width}.webp`;

describe("cmsImageLoader", () => {
  const load = cmsImageLoader(photo);

  it.each([
    [320, 320],
    [321, 640],
    [640, 640],
    [900, 960],
    [1280, 1280],
    [1500, 1920],
    [2560, 2560],
    [4000, 2560],
  ])("a request for %i px gets the %i px WEBP variant", (asked, got) => {
    expect(load({ width: asked })).toBe(w(got));
  });

  it("answers every width the site asks for with a different file", () => {
    const urls = VARIANT_WIDTHS.map((width) => load({ width }));
    expect(new Set(urls).size).toBe(VARIANT_WIDTHS.length);
  });

  it("never picks AVIF", () => {
    for (const width of VARIANT_WIDTHS) expect(load({ width })).toMatch(/\.webp$/);
  });

  it("uses the largest variant when the original is narrower than the request", () => {
    const small = { ...photo, variants: variants([320, 640]) };
    expect(cmsImageLoader(small)({ width: 1920 })).toBe(w(640));
  });
});

describe("hasVariants", () => {
  it("is true for a processed photo", () => expect(hasVariants(photo)).toBe(true));
  it("is false while the CMS is still processing", () =>
    expect(hasVariants({ ...photo, variants: [] })).toBe(false));
  it("is false for a vector picture, even if variants were listed", () =>
    expect(hasVariants({ ...photo, mimeType: "image/svg+xml" })).toBe(false));
  it("is false when only AVIF exists", () =>
    expect(
      hasVariants({ ...photo, variants: photo.variants.filter((v) => v.format === "AVIF") }),
    ).toBe(false));
});

describe("fallback to the original", () => {
  it("the loader gives the picture's own address when there is no variant", () => {
    const gif = { url: `${base}/x.gif`, mimeType: "image/gif", variants: [] };
    expect(cmsImageLoader(gif)({ width: 640 })).toBe(gif.url);
  });

  it("a logo without variants stays as it is", () => {
    const svg = { url: `${base}/logo.svg`, mimeType: "image/svg+xml", variants: [] };
    expect(logoSource(svg, 160)).toBe(svg.url);
  });

  it("a logo with variants gets the one for a 2x screen", () => {
    expect(logoSource(photo, 160)).toBe(w(320));
    expect(logoSource(photo, 90)).toBe(w(320));
    expect(logoSource(photo, 400)).toBe(w(960));
  });
});

describe("truthfulSrcSet", () => {
  it("labels each file with its real width and drops repeats", () => {
    const small = { ...photo, variants: variants([320, 640]) };
    const asked = `${w(320)} 320w, ${w(640)} 640w, ${w(640)} 960w, ${w(640)} 1280w`;
    expect(truthfulSrcSet(small, asked)).toBe(`${w(320)} 320w, ${w(640)} 640w`);
  });

  it("leaves an empty or missing srcset alone", () => {
    expect(truthfulSrcSet(photo, undefined)).toBeUndefined();
    expect(truthfulSrcSet(photo, "")).toBe("");
  });
});

describe("lightboxUrl", () => {
  it("is the file the picture's srcset picks for the window", () => {
    expect(lightboxUrl(photo, 1440, 1)).toBe(w(1920));
    expect(lightboxUrl(photo, 390, 1)).toBe(w(640));
    expect(lightboxUrl(photo, 390, 3)).toBe(w(1280));
    expect(lightboxUrl(photo, 1920, 2)).toBe(w(2560));
  });

  it("is null for a picture without variants", () => {
    expect(lightboxUrl({ ...photo, variants: [] }, 1440, 1)).toBeNull();
  });
});

describe("placeholderOf", () => {
  it("passes an image data address", () => {
    const data = "data:image/webp;base64,AAAA";
    expect(placeholderOf({ placeholder: data })).toBe(data);
  });
  it.each([null, "", "https://example.com/p.webp", "data:text/html;base64,AAAA"])(
    "ignores %j",
    (placeholder) => expect(placeholderOf({ placeholder })).toBeUndefined(),
  );
});
