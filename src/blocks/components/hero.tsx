import { messagesFor } from "@/lib/messages";
import { validTimeZone } from "@/lib/format";
import { readNowData } from "@/lib/now-data";
import { nowLine } from "@/lib/now-line";
import { Buttons } from "./cms-link";
import { CmsImage } from "./cms-image";
import { NowLine } from "./now-line";
import type { BlockProps } from "./props";

/** The brand's nested C's, drawn when the hero has no picture (the prototype's hero art). */
function Emblem() {
  return (
    <svg viewBox="0 0 1000 1000" fillRule="evenodd" aria-hidden="true" focusable="false">
      <g className="ring">
        <path
          d="M500 20a480 480 0 1 0 0 960a480 480 0 1 0 0-960zM620 120a400 400 0 1 1 0 760a400 400 0 1 1 0-760z"
          fill="#F3EDE4"
        />
      </g>
      <g className="ring">
        <path
          d="M500 180a320 320 0 1 0 0 640a320 320 0 1 0 0-640zM590 250a260 260 0 1 1 0 500a260 260 0 1 1 0-500z"
          fill="#F3EDE4"
        />
      </g>
      <g className="ring">
        <path
          d="M500 310a190 190 0 1 0 0 380a190 190 0 1 0 0-380zM560 360a150 150 0 1 1 0 300a150 150 0 1 1 0-300z"
          fill="#E0A33B"
        />
      </g>
      <g className="ring">
        <path
          d="M500 410a90 90 0 1 0 0 180a90 90 0 1 0 0-180zM530 440a64 64 0 1 1 0 128a64 64 0 1 1 0-128z"
          fill="#F3EDE4"
        />
      </g>
    </svg>
  );
}

/**
 * The top of the page: the headline, one sentence, the buttons and, on the first block of a page,
 * the "now" line (open until, and what is on next). The picture is the CMS's; without one the
 * brand's emblem is drawn.
 */
export async function Hero({ block, ctx }: BlockProps<"hero">) {
  const d = block.data;
  const Heading = ctx.lead ? "h1" : "h2";
  const timeZone = validTimeZone(ctx.timeZone);
  const now = ctx.lead && !ctx.preview ? await readNowData(ctx.locale) : null;
  const input = now ? { ...now, timeZone, locale: ctx.locale } : null;
  const line = input ? nowLine({ ...input, now: new Date() }, ctx.messages.now) : null;
  const art = d.image ?? d.darkImage ?? null;
  return (
    <section
      id={block.anchorId ?? undefined}
      aria-labelledby={`${block.id}-h`}
      className={`hero wrap${art ? "" : " has-emblem"}`}
      data-block-id={block.id}
    >
      <div>
        {d.eyebrow ? <p className="eyebrow">{d.eyebrow}</p> : null}
        <Heading id={`${block.id}-h`}>{d.heading}</Heading>
        {d.text ? (
          <p className="sub" data-reveal>
            {d.text}
          </p>
        ) : null}
        <Buttons buttons={d.buttons} className="actions" />
        {d.note ? <p className="hero-note">{d.note}</p> : null}
        {line && input ? (
          <NowLine initial={line} input={input} messages={messagesFor(ctx.locale).now} />
        ) : null}
      </div>
      <figure className="art" aria-hidden={art ? undefined : true}>
        {art ? (
          <CmsImage image={art} sizes="(min-width: 901px) 40vw, 86vw" priority={ctx.lead} cover />
        ) : (
          <Emblem />
        )}
      </figure>
    </section>
  );
}
