import Link from "next/link";
import { fill } from "@/lib/format";
import { CmsImage } from "./cms-image";
import { intervalsText } from "./hours";
import { Section, SectionHead } from "./section";
import type { BlockContext, BlockProps } from "./props";
import type { ResolvedLocation } from "../types";
import { ItemTitle } from "../heading-level";

function status(location: ResolvedLocation, ctx: BlockContext) {
  const m = ctx.messages.blocks;
  if (location.openNow === null) return null;
  const today = location.todayHours;
  const hours =
    today && !today.closed && today.intervals.length > 0
      ? fill(m.todayHours, { hours: intervalsText(today.intervals, ctx.messages) })
      : today
        ? m.todayClosed
        : null;
  return {
    open: location.openNow,
    text: [location.openNow ? m.openNow : m.closedNow, hours].filter(Boolean).join(" · "),
  };
}

/**
 * The venues of the locations module as a picker: one brick per venue with its address and
 * whether it is open now. A venue whose page the API could not name is a brick without a link.
 */
export function LocationList({ block, ctx }: BlockProps<"locationList">) {
  const d = block.data;
  const locations = d.locations ?? [];
  if (locations.length === 0) return null;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
      <ul className={`venues ${d.layout ?? "cards"}`}>
        {locations.map((location) => {
          const state = d.showHours === false ? null : status(location, ctx);
          const city = [location.address.postalCode, location.address.city]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={location.id} className="venue" data-reveal>
              {location.image ? (
                <div className="venue-image">
                  <CmsImage
                    image={location.image}
                    sizes="(min-width: 901px) 33vw, (min-width: 561px) 50vw, 100vw"
                    cover
                  />
                </div>
              ) : null}
              <div className="venue-body">
                <ItemTitle hasHeading={Boolean(d.heading)}>{location.name}</ItemTitle>
                <address>
                  {location.address.street}
                  <br />
                  {city}
                </address>
                {state ? (
                  <p className={`status ${state.open ? "open" : "closed"}`}>{state.text}</p>
                ) : null}
                {location.href ? (
                  <Link className="venue-link" href={location.href}>
                    {ctx.messages.blocks.viewLocation}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
