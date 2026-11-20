import localFont from "next/font/local";

// The two brand fonts, self-hosted (docs/decisions/0002). Each ships as a Latin and a Latin
// Extended file (the Extended one holds č, ć, š, ž and đ). `next/font/local` makes one family per
// call, so each file is a family of its own with the `unicode-range` it covers, and the
// stylesheet lists the pair: the browser takes a character from the first family that has it.
// (The ranges are written out in each call: the font loader reads literals only.)
// No size-adjusted fallback face is added (`adjustFontFallback: false`): a fallback face has no
// range and would catch the Extended letters before the second family is asked.

const displayLatin = localFont({
  src: [
    {
      path: "../fonts/bricolage-grotesque-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-display-latin",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

const displayExt = localFont({
  src: [
    {
      path: "../fonts/bricolage-grotesque-latin-ext-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-display-ext",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
});

const bodyLatin = localFont({
  src: [{ path: "../fonts/dm-sans-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-body-latin",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

const bodyExt = localFont({
  src: [
    { path: "../fonts/dm-sans-latin-ext-wght-normal.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-body-ext",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
});

/** The class names of the four font families, for the `<html>` element. */
export const fontClassNames = [
  displayLatin.variable,
  displayExt.variable,
  bodyLatin.variable,
  bodyExt.variable,
].join(" ");
