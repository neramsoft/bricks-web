import type { PublicSite } from "@probiz/sdk";

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * The CMS brand's colours as CSS variables for `<style>`. Only a six-digit hex colour is
 * written (the value goes into a style element, so nothing else may). The site theme
 * (src/styles/theme.css) uses `--brand-primary` for the light theme's primary colour and
 * falls back to its own token when the variable is missing.
 */
export function brandCss(brand: PublicSite["brand"] | undefined): string {
  const primary = brand?.colors.primary;
  if (!primary || !HEX_COLOUR.test(primary)) return "";
  return `:root{--brand-primary:${primary}}`;
}
