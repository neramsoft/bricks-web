import { describe, expect, it } from "vitest";
import { SseParser } from "./sse";

describe("SseParser", () => {
  it("reads the API's stream: retry, a heartbeat comment, then events", () => {
    const parser = new SseParser();
    const events = parser.push(
      'retry: 5000\n\n: ping\n\nevent: order.updated\ndata: {"type":"order.updated","id":"1","status":"NOVA"}\n\n',
    );
    expect(parser.retryMs).toBe(5000);
    expect(events).toEqual([
      { event: "order.updated", data: '{"type":"order.updated","id":"1","status":"NOVA"}' },
    ]);
  });

  it("joins several data lines with a newline", () => {
    expect(new SseParser().push("data: a\ndata: b\n\n")).toEqual([
      { event: "message", data: "a\nb" },
    ]);
  });

  it("handles chunks cut anywhere, CRLF and a CR split across chunks", () => {
    const parser = new SseParser();
    const text = "event: e\r\ndata: x\r\n\r\nevent: f\ndata: y\n\n";
    const events = [];
    for (const ch of text) events.push(...parser.push(ch));
    expect(events).toEqual([
      { event: "e", data: "x" },
      { event: "f", data: "y" },
    ]);
  });

  it("ignores heartbeats between events and fields without data", () => {
    const parser = new SseParser();
    expect(parser.push(": ping\n\n: ping\n\nevent: lonely\n\n")).toEqual([]);
    expect(parser.push("data:no-space\n\n")).toEqual([{ event: "message", data: "no-space" }]);
    // An event name does not leak into the next event.
    expect(parser.push("data: z\n\n")).toEqual([{ event: "message", data: "z" }]);
  });

  it("keeps a partial event until its blank line arrives", () => {
    const parser = new SseParser();
    expect(parser.push("event: a\ndata: 1")).toEqual([]);
    expect(parser.push("\n\n")).toEqual([{ event: "a", data: "1" }]);
  });
});
