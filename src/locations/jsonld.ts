import type { PublicSite } from "@probiz/sdk";
import { businessTypes } from "@/lib/jsonld";
import { absoluteUrl } from "@/lib/locale";
import type { ResolvedLocation } from "@/blocks/types";

// `LocalBusiness` structured data of the venues a page lists. Only what the card shows: the name,
// the address, the phone, the email, the picture and the page of the venue. Opening hours and a
// position are not here, because the card shows neither (it shows today's hours as words).

type Ld = Record<string, unknown>;

export function locationLd(options: {
  location: ResolvedLocation;
  site: PublicSite;
  siteUrl: string;
}): Ld {
  const { location, site, siteUrl } = options;
  const { address } = location;
  return {
    "@type": businessTypes(site.business.businessType),
    name: location.name,
    ...(location.href ? { url: absoluteUrl(siteUrl, location.href) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      addressCountry: address.country,
    },
    ...(location.phone ? { telephone: location.phone } : {}),
    ...(location.email ? { email: location.email } : {}),
    ...(location.image ? { image: [absoluteUrl(siteUrl, location.image.url)] } : {}),
    parentOrganization: { "@id": `${absoluteUrl(siteUrl, "/")}#organization` },
  };
}
