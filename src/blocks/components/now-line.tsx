"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@/lib/messages";
import { nowLine, type NextEvent, type NowLine as Line, type TodayHours } from "@/lib/now-line";

export interface NowLineInput {
  openNow: boolean | null;
  today: TodayHours | null;
  event: NextEvent | null;
  timeZone: string;
  locale: string;
}

/**
 * The hero's "now" line. The server draws it complete (`initial`, worked out when the page was
 * rendered); because the page is cached, the browser works the same line out again when it loads
 * and once a minute, so it stays true. Without script the server's line stays.
 */
export function NowLine({
  initial,
  input,
  messages,
}: {
  initial: Line;
  input: NowLineInput;
  messages: Messages["now"];
}) {
  const [line, setLine] = useState(initial);
  useEffect(() => {
    const update = () => setLine(nowLine({ ...input, now: new Date() }, messages));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [input, messages]);
  if (!line.headline && !line.event) return null;
  return (
    <p className="now" data-mode={line.mode} data-reveal>
      {line.headline ? <b>{line.headline}</b> : null}
      {line.event ? <span>{line.event}</span> : null}
    </p>
  );
}
