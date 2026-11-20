import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blockFixture } from "../../test/fixtures/page";

const ID2 = "00000000-0000-4000-8000-000000000002";
import { Blocks, parseBlocks } from "./blocks";

const render = (blocks: ReturnType<typeof blockFixture>[]) =>
  renderToStaticMarkup(<Blocks blocks={parseBlocks(blocks, () => {})} />);

describe("Blocks", () => {
  it("draws every known block type as a section with its type, heading and text", () => {
    const html = render([
      blockFixture("hero", { heading: "Bricks", text: "Café-bar" }),
      blockFixture("statement", { text: "Dobrodošli" }, { id: ID2, anchorId: "uvod" }),
    ]);
    expect(html).toContain('<section data-block="hero"><h1>Bricks</h1><p>Café-bar</p></section>');
    expect(html).toContain('data-block="statement"');
    expect(html).toContain('id="uvod"');
  });

  it("draws nothing for an unknown type and never throws", () => {
    expect(render([blockFixture("doesNotExist", { heading: "x" })])).toBe("");
  });
});
