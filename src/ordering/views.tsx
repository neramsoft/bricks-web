import Image from "next/image";
import { logoSource } from "@/lib/image-variants";
import type { ReactNode } from "react";
import type { PublicSite } from "@probiz/sdk";

/** The logo of the table pages: the CMS brand's, or the wordmark until it has one. */
export function orderLogo(site: PublicSite) {
  const logo = site.brand.logoDark ?? site.brand.logoLight;
  return logo
    ? {
        src: logoSource(logo, 90),
        width: logo.width,
        height: logo.height,
        unoptimized: true,
      }
    : { src: "/brand/bricks-wordmark-white.png", width: 498, height: 171, unoptimized: true };
}

/** The phone-width page around a message (an invalid code, ordering switched off). Server-rendered. */
export function MessagePage({
  site,
  heading,
  lead,
  homeHref,
}: {
  site: PublicSite;
  heading: ReactNode;
  lead: ReactNode;
  homeHref: string;
}) {
  const logo = orderLogo(site);
  const name = site.business.name ?? site.business.legalName;
  return (
    <div className="ord-phone">
      <header className="ord-top">
        <a href={homeHref} aria-label={name ?? "Home"}>
          <Image
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            sizes="90px"
            priority
            unoptimized={logo.unoptimized}
            style={{ height: 30, width: "auto" }}
          />
        </a>
      </header>
      <main className="ord-invalid">
        <h1>{heading}</h1>
        <p>{lead}</p>
      </main>
    </div>
  );
}
