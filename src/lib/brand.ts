import type { PublicSite } from "@probiz/sdk";

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * The CMS brand's colours as CSS variables for `<style>`. Only a six-digit hex colour is written
 * (the value goes into a style element, so nothing else may). The theme (src/styles/tokens.css)
 * uses `--brand-primary` for the brick colour and `--brand-accent` for the amber, and falls back
 * to the prototype's own values when a variable is missing.
 */
export function brandCss(brand: PublicSite["brand"] | undefined): string {
  const entries: Array<[string, string | undefined]> = [
    ["--brand-primary", brand?.colors.primary],
    ["--brand-accent", brand?.colors.accent],
  ];
  const declarations = entries.flatMap(([name, value]) =>
    value && HEX_COLOUR.test(value) ? [`${name}:${value}`] : [],
  );
  return declarations.length > 0 ? `:root{${declarations.join(";")}}` : "";
}
