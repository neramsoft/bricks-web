import { describe, expect, it } from "vitest";
import { blockFixture } from "../../test/fixtures/page";

const ID2 = "00000000-0000-4000-8000-000000000002";
import { parseBlock, parseBlocks, stripResolved } from "./parse";

describe("parseBlocks", () => {
  it("keeps a valid block with its defaults and the data the API added", () => {
    const [block] = parseBlocks([blockFixture("statement", { text: "Dobrodošli" })]);
    expect(block).toMatchObject({ type: "statement", anchorId: null });
    expect((block?.data as { text?: string }).text).toBe("Dobrodošli");
  });

  it("skips an unknown type with a warning and keeps the rest", () => {
    const warnings: string[] = [];
    const blocks = parseBlocks(
      [blockFixture("doesNotExist"), blockFixture("statement", { text: "A" }, { id: ID2 })],
      (message) => warnings.push(message),
    );
    expect(blocks.map((block) => block.type)).toEqual(["statement"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('unknown type "doesNotExist"');
  });

  it("skips a block whose data does not fit its schema", () => {
    const warnings: string[] = [];
    expect(parseBlock(blockFixture("hero", { heading: 5 }), (m) => warnings.push(m))).toBeNull();
    expect(warnings[0]).toContain("hero");
  });
});

describe("stripResolved", () => {
  it("takes out what the API resolved next to a media reference", () => {
    const stored = stripResolved({ mediaId: "m", image: { url: "/x" }, text: "t", hours: [] });
    expect(stored).toEqual({ mediaId: "m", text: "t" });
  });
});
