import type { PublicSite } from "@probiz/sdk";
import { absoluteUrl } from "./locale";
import type { Crumb } from "./breadcrumbs";

// JSON-LD must match the visible page (CLAUDE.md): every field here is also shown by the header,
// the footer or the page itself.

type JsonLd = Record<string, unknown>;

/**
 * Types that go with the business type the CMS holds. Bricks is a café-bar: the CMS's business
 * type is `BarOrPub` (a `LocalBusiness` > `FoodEstablishment` subtype) and it is also a
 * `CafeOrCoffeeShop`, a sibling subtype, so both go into `@type` as an array. A node with several
 * types is plain JSON-LD and schema.org's own pattern for multi-typed things, and Google's
 * structured-data parser reads every type in the array. `additionalType` is not used: schema.org
 * documents it for types of external vocabularies, given as a URL, and Google ignores it.
 */
const EXTRA_TYPES: Record<string, readonly string[]> = { BarOrPub: ["CafeOrCoffeeShop"] };

/** `@type` of the business: its subtype alone, or the array when it has more than one. */
export function businessTypes(businessType: string | null | undefined): string | string[] {
  const type = businessType || "Organization";
  const extra = EXTRA_TYPES[type];
  return extra ? [type, ...extra] : type;
}

/** The first address of the business: the one the footer shows. */
export function primaryAddress(site: PublicSite) {
  return site.business.addresses[0] ?? null;
}

/** The business (`Organization` or its `LocalBusiness` subtype) from the business settings. */
export function organizationLd(site: PublicSite, siteUrl: string): JsonLd | null {
  const { business, brand } = site;
  const name = business.name ?? business.legalName;
  if (!name) return null;
  const address = primaryAddress(site);
  const sameAs = business.social.map((link) => link.url);
  const logo = brand.logoLight?.url ?? null;
  return {
    "@type": businessTypes(business.businessType),
    "@id": `${absoluteUrl(siteUrl, "/")}#organization`,
    name,
    ...(business.legalName && business.legalName !== name ? { legalName: business.legalName } : {}),
    url: absoluteUrl(siteUrl, "/"),
    ...(business.description ? { description: business.description } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(logo ? { logo: absoluteUrl(siteUrl, logo) } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(address.street ? { streetAddress: address.street } : {}),
            addressLocality: address.city,
            ...(address.postalCode ? { postalCode: address.postalCode } : {}),
            ...(address.region ? { addressRegion: address.region } : {}),
            addressCountry: address.country,
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteLd(site: PublicSite, siteUrl: string, locale: string): JsonLd | null {
  const name = site.business.name ?? site.business.legalName;
  if (!name) return null;
  return {
    "@type": "WebSite",
    "@id": `${absoluteUrl(siteUrl, "/")}#website`,
    name,
    url: absoluteUrl(siteUrl, "/"),
    inLanguage: locale,
    publisher: { "@id": `${absoluteUrl(siteUrl, "/")}#organization` },
  };
}

export function breadcrumbLd(crumbs: readonly Crumb[], siteUrl: string): JsonLd | null {
  if (crumbs.length === 0) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      // A step with no page has no address to name (it is text on the page too).
      ...(crumb.link === false ? {} : { item: absoluteUrl(siteUrl, crumb.href) }),
    })),
  };
}

/** One `@graph` document from the parts that exist. Null when there is nothing to say. */
export function graph(parts: ReadonlyArray<JsonLd | null>): JsonLd | null {
  const nodes = parts.filter((part): part is JsonLd => part !== null);
  return nodes.length === 0 ? null : { "@context": "https://schema.org", "@graph": nodes };
}

/** Safe to put inside a `<script>`: `<` can't close the tag. */
export function serializeLd(document: JsonLd): string {
  return JSON.stringify(document).replace(/</g, "\\u003c");
}
