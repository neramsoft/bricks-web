import Link from "next/link";
import { CmsImage } from "./cms-image";
import {
  badgesOf,
  dateTile,
  featuredIndex,
  priceText,
  whenText,
  type EventSummary,
} from "@/events/view-model";
import type { BlockContext, BlockProps } from "./props";
import { SectionHead } from "./section";

function Event({
  event,
  featured,
  ctx,
  headingId,
}: {
  event: EventSummary;
  featured: boolean;
  ctx: BlockContext;
  headingId: string;
}) {
  const { messages, locale, timeZone } = ctx;
  const tile = dateTile(event.startsAt, timeZone, locale);
  const meta = [
    whenText(event, timeZone, locale, messages.events),
    event.category,
    event.place?.name,
    priceText(event, locale, messages.events),
  ].filter(Boolean);
  const badges = badgesOf(event, messages.events);
  return (
    <li
      className={`ev${featured ? " featured" : ""}`}
      data-event-status={event.eventStatus}
      data-reveal
    >
      <time className="tile-date" dateTime={event.startsAt}>
        <b>{tile.day}</b>
        <span>{tile.month}</span>
      </time>
      <div>
        <h3 id={headingId}>{event.title}</h3>
        <p className="meta">{meta.join(" · ")}</p>
        {event.summary ? <p>{event.summary}</p> : null}
        {badges.map((badge) => (
          <span key={badge} className="badge">
            {badge}
          </span>
        ))}
        {featured && event.image ? (
          <div className="ev-photo">
            <CmsImage image={event.image} sizes="(min-width: 901px) 50vw, 100vw" cover />
          </div>
        ) : null}
        {event.href ? (
          <Link className="ev-link" href={event.href} aria-describedby={headingId}>
            {messages.events.viewEvent}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The events of the events module, in the prototype's "Uživo" chapter: the lead on the left, the
 * list on the right with the first featured event drawn wide. Times are shown in the site's time
 * zone, whatever the visitor's. With no event the block shows its `emptyText`, or nothing.
 */
export function EventList({ block, ctx }: BlockProps<"eventList">) {
  const d = block.data;
  const events = (d.events ?? []).filter((event) => event.title);
  if (events.length === 0) {
    if (!d.events || !d.emptyText) return null;
    return (
      <section
        id={block.anchorId ?? undefined}
        className="block wrap"
        data-block-id={block.id}
        aria-labelledby={d.heading ? `${block.id}-h` : undefined}
      >
        <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
        <p className="block-empty" role="status">
          {d.emptyText}
        </p>
      </section>
    );
  }
  const featured = featuredIndex(events);
  return (
    <section
      id={block.anchorId ?? undefined}
      aria-labelledby={d.heading ? `${block.id}-h` : undefined}
      className="chapter wrap"
      data-block-id={block.id}
    >
      <div className="chapter-lead">
        {d.heading ? (
          <h2 className="h-chapter" id={`${block.id}-h`} data-reveal>
            {d.heading}
          </h2>
        ) : null}
        {d.intro ? <p data-reveal>{d.intro}</p> : null}
      </div>
      <div className="chapter-body">
        <ul className={`ev-list ${d.layout ?? "cards"}`}>
          {events.map((event, index) => (
            <Event
              key={event.id}
              event={event}
              featured={index === featured}
              ctx={ctx}
              headingId={`${block.id}-e${index}`}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
