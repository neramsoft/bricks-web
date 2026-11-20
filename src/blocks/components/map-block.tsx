import { dialable } from "@/lib/format";
import type { RenderData } from "../types";
import type { BlockContext } from "./props";
import { Section } from "./section";

type Data = RenderData["map"];

/** Google Maps' directions to a point: a link, never an embedded frame. */
export const directionsUrl = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

/**
 * Where we are: the place's name, the business's address, a "Directions" button to Google Maps at
 * the block's coordinates and the phone. No map is embedded, so no other site is called on load.
 */
export function PlacePanel({
  id,
  anchorId,
  data,
  ctx,
}: {
  id: string;
  anchorId: string | null;
  data: Data;
  ctx: BlockContext;
}) {
  const address = ctx.site.business.addresses[0] ?? null;
  const phone = ctx.site.business.phone;
  const name = data.label ?? ctx.site.business.name;
  return (
    <div className="panel place" id={anchorId ?? undefined} data-block-id={id}>
      {data.heading ? <h2 id={`${id}-h`}>{data.heading}</h2> : null}
      <address className="addr">
        {name ? <b>{name}</b> : null}
        {address?.street ? (
          <>
            <br />
            {address.street}
          </>
        ) : null}
        {address ? (
          <>
            <br />
            {[address.postalCode, address.city].filter(Boolean).join(" ")}
          </>
        ) : null}
      </address>
      <div className="acts">
        <a
          className="btn"
          href={directionsUrl(data.latitude, data.longitude)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ctx.messages.blocks.navigate}
        </a>
        {phone ? (
          <a className="btn quiet" href={`tel:${dialable(phone)}`}>
            {phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function MapBlock({
  block,
  ctx,
}: {
  block: { id: string; anchorId: string | null; data: Data };
  ctx: BlockContext;
}) {
  return (
    <Section id={block.id} anchorId={null} heading={block.data.heading}>
      <PlacePanel id={block.id} anchorId={block.anchorId} data={block.data} ctx={ctx} />
    </Section>
  );
}
