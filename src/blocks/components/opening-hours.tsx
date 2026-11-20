import type { BlockContext } from "./props";
import type { RenderData } from "../types";
import { HoursList } from "./hours";
import { Section } from "./section";

type Data = RenderData["openingHours"];

/** The hours card: also used on its own inside a panel pair with the map (blocks.tsx). */
export function HoursPanel({
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
  if (!data.hours || data.hours.weekly.length === 0) return null;
  return (
    <div className="panel" id={anchorId ?? undefined} data-block-id={id}>
      {data.heading ? (
        <h2 className="h-section" id={`${id}-h`} style={{ marginBottom: 24 }}>
          {data.heading}
        </h2>
      ) : null}
      <HoursList
        hours={data.hours}
        locale={ctx.locale}
        messages={ctx.messages}
        timeZone={ctx.timeZone}
        showExceptions={data.showExceptions ?? true}
      />
    </div>
  );
}

export function OpeningHours({
  block,
  ctx,
}: {
  block: { id: string; anchorId: string | null; data: Data };
  ctx: BlockContext;
}) {
  if (!block.data.hours || block.data.hours.weekly.length === 0) return null;
  return (
    <Section id={block.id} anchorId={null} heading={block.data.heading}>
      <HoursPanel id={block.id} anchorId={block.anchorId} data={block.data} ctx={ctx} />
    </Section>
  );
}
