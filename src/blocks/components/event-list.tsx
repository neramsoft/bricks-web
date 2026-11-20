import Link from "next/link";
import { CmsImage } from "./cms-image";
import { featuredPerformers } from "@/events/performers";
import {
  badgesOf,
  dateTile,
  entryText,
  fullWhenText,
  icsUrl,
  placeText,
  rowWhenText,
  splitEvents,
  type EventSummary,
} from "@/events/view-model";
import { env } from "@/lib/env";
import type { BlockContext, BlockProps } from "./props";
import { SectionHead } from "./section";

function DateTile({ event, ctx }: { event: EventSummary; ctx: BlockContext }) {
  const tile = dateTile(event.startsAt, ctx.timeZone, ctx.locale);
  return (
    <time className="tile-date" dateTime={event.startsAt}>
      <b>{tile.day}</b>
      <span>{tile.month}</span>
    </time>
  );
}

function Badges({ event, ctx }: { event: EventSummary; ctx: BlockContext }) {
  return badgesOf(event, ctx.messages.events).map((badge) => (
    <span key={badge} className="badge">
      {badge}
    </span>
  ));
}

/** The next event, wide: the photograph, the date, the facts, the buttons. */
function FeaturedEvent({
  event,
  performers,
  ctx,
  headingId,
}: {
  event: EventSummary;
  performers: string[];
  ctx: BlockContext;
  headingId: string;
}) {
  const { messages, locale, timeZone } = ctx;
  const m = messages.events;
  const entry = entryText(event, locale, m);
  const place = placeText(event.place);
  const facts: [string, string][] = [
    [m.when, fullWhenText(event, timeZone, locale, m)],
    ...(event.place?.name ? [[m.where, event.place.name] as [string, string]] : []),
    ...(entry ? [[m.entry, entry] as [string, string]] : []),
    ...(performers.length > 0 ? [[m.performers, performers.join(", ")] as [string, string]] : []),
  ];
  const publicApi = env().PUBLIC_API_URL ?? env().API_URL;
  return (
    <article
      className="ev-featured"
      data-event-status={event.eventStatus}
      aria-labelledby={headingId}
      data-reveal
    >
      {event.image ? (
        <div className="ev-photo">
          <CmsImage
            image={event.image}
            sizes="(min-width: 901px) 55vw, 100vw"
            cover
            priority={false}
          />
        </div>
      ) : null}
      <div className="ev-fbody">
        <DateTile event={event} ctx={ctx} />
        <div className="ev-ftext">
          <p className="ev-kind">{[m.upNext, event.category].filter(Boolean).join(" · ")}</p>
          <h3 id={headingId}>{event.title}</h3>
          <Badges event={event} ctx={ctx} />
          <dl className="ev-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd title={label === m.where && place ? place : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
          {event.summary ? <p className="ev-summary">{event.summary}</p> : null}
          <div className="ev-cta">
            {ctx.reservationAnchor ? (
              <a className="btn" href={`#${ctx.reservationAnchor}`}>
                {m.reserve}
              </a>
            ) : null}
            <a className="btn quiet" href={icsUrl(publicApi, event.id)}>
              {m.addToCalendar}
            </a>
            {event.href ? (
              <Link className="ev-link" href={event.href} aria-describedby={headingId}>
                {m.viewEvent}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function EventRow({
  event,
  ctx,
  headingId,
}: {
  event: EventSummary;
  ctx: BlockContext;
  headingId: string;
}) {
  const { messages, locale, timeZone } = ctx;
  const meta = [
    rowWhenText(event, timeZone, locale, messages.events),
    event.category,
    event.place?.name,
    entryText(event, locale, messages.events),
  ].filter(Boolean);
  return (
    <li className="ev" data-event-status={event.eventStatus}>
      <DateTile event={event} ctx={ctx} />
      <div>
        <h4 id={headingId}>{event.title}</h4>
        <p className="meta">{meta.join(" · ")}</p>
        {event.summary ? <p>{event.summary}</p> : null}
        <Badges event={event} ctx={ctx} />
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
 * The events of the events module, in the prototype's "Uživo" chapter: the lead on the left, on
 * the right the next event drawn wide with its photograph (always the first one that is not over,
 * not the CMS's `featured` flag) and the others below it as rows. Times are shown in the site's
 * time zone, whatever the visitor's. With no event the block shows its `emptyText`, or nothing.
 */
export async function EventList({ block, ctx }: BlockProps<"eventList">) {
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
  const { first, rest } = splitEvents(events);
  const performers = first ? await featuredPerformers(events, ctx.locale) : [];
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
        {first ? (
          <FeaturedEvent
            event={first}
            performers={performers}
            ctx={ctx}
            headingId={`${block.id}-e0`}
          />
        ) : null}
        {rest.length > 0 ? (
          <div className="ev-more" data-reveal>
            <h3 className="ev-more-h" id={`${block.id}-more`}>
              {ctx.messages.events.after}
            </h3>
            <ul className="ev-list" aria-labelledby={`${block.id}-more`}>
              {rest.map((event, index) => (
                <EventRow
                  key={event.id}
                  event={event}
                  ctx={ctx}
                  headingId={`${block.id}-e${index + 1}`}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
