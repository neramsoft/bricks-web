import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blockFixture } from "../../test/fixtures/page";
import { siteFixture } from "../../test/fixtures/site";
import { messagesFor } from "@/lib/messages";
import { Blocks, parseBlocks } from "./blocks";

const ID2 = "00000000-0000-4000-8000-000000000002";

const page = {
  messages: messagesFor("bs"),
  locale: "bs",
  site: siteFixture(),
  timeZone: "Europe/Sarajevo",
  path: "/",
  preview: false,
};

const render = (blocks: ReturnType<typeof blockFixture>[]) =>
  renderToStaticMarkup(<Blocks blocks={parseBlocks(blocks, () => {})} page={page} />);

describe("Blocks", () => {
  it("draws a statement with its text and anchor", () => {
    const html = render([blockFixture("statement", { text: "Dobrodošli" }, { anchorId: "uvod" })]);
    expect(html).toContain("Dobrodošli");
    expect(html).toContain('id="uvod"');
  });

  it("draws nothing for an unknown type and never throws", () => {
    expect(render([blockFixture("doesNotExist", { heading: "x" })])).toBe("");
  });

  it("draws nothing for a block of a known type this site has no component for", () => {
    expect(render([blockFixture("faq", { items: [{ question: "a", answer: "b" }] })])).toBe("");
  });

  it("keeps the order of the blocks", () => {
    const html = render([
      blockFixture("statement", { text: "Prvi" }),
      blockFixture("statement", { text: "Drugi" }, { id: ID2 }),
    ]);
    expect(html.indexOf("Prvi")).toBeLessThan(html.indexOf("Drugi"));
  });

  describe("heading order", () => {
    const items = [{ title: "Bašta", text: "Napolju" }];
    const levels = (html: string) => [...html.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));

    it("draws the items of a features block without a heading at h2", () => {
      expect(levels(render([blockFixture("features", { items })]))).toEqual([2]);
    });

    it("draws the items of a features block with a heading one level below it", () => {
      expect(levels(render([blockFixture("features", { heading: "Mjesta", items })]))).toEqual([
        2, 3,
      ]);
    });
  });
});
