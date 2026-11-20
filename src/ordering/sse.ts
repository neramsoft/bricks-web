// A reader for the text of a Server-Sent Events stream (`fetch` and a body reader, because an
// EventSource cannot send the `X-Ordering-Secret` header). Follows the SSE rules the API uses:
// `retry: 5000`, `event:` and `data:` lines (several data lines join with a newline), comment
// lines (`: ping`, the heartbeat) that carry nothing, and an empty line that ends an event.

export interface SseEvent {
  event: string;
  data: string;
}

export class SseParser {
  private buffer = "";
  private event = "";
  private data: string[] = [];
  /** The server's `retry:` hint in milliseconds, once it said one. */
  retryMs: number | null = null;

  /** Feeds a piece of the stream; returns the events it completed. */
  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const events: SseEvent[] = [];
    let start = 0;
    for (let i = 0; i < this.buffer.length; i += 1) {
      const ch = this.buffer[i];
      if (ch !== "\n" && ch !== "\r") continue;
      // CRLF is one line break; a lone CR at the end may be the first half of one.
      if (ch === "\r" && i === this.buffer.length - 1) break;
      const line = this.buffer.slice(start, i);
      if (ch === "\r" && this.buffer[i + 1] === "\n") i += 1;
      start = i + 1;
      const done = this.line(line);
      if (done) events.push(done);
    }
    this.buffer = this.buffer.slice(start);
    return events;
  }

  private line(line: string): SseEvent | null {
    if (line === "") {
      if (this.data.length === 0) {
        this.event = "";
        return null;
      }
      const event = { event: this.event || "message", data: this.data.join("\n") };
      this.event = "";
      this.data = [];
      return event;
    }
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") this.event = value;
    else if (field === "data") this.data.push(value);
    else if (field === "retry" && /^\d+$/.test(value)) this.retryMs = Number(value);
    return null;
  }
}
