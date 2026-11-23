import { describe, expect, it } from "vitest";
import { parseDescription } from "./description";
import { oneLineSummary, splitSummary } from "./summary";

const texts = (chips: { text: string }[]) => chips.map((chip) => chip.text);

describe("parseDescription", () => {
  it("gives nothing for no description", () => {
    expect(parseDescription(null)).toEqual({ prose: [], chips: [] });
    expect(parseDescription(undefined)).toEqual({ prose: [], chips: [] });
    expect(parseDescription("  ")).toEqual({ prose: [], chips: [] });
  });

  it("keeps a plain sentence as prose", () => {
    expect(parseDescription("Julius Meinl, bečka pržionica. Dupli na zahtjev.")).toEqual({
      prose: ["Julius Meinl, bečka pržionica. Dupli na zahtjev."],
      chips: [],
    });
  });

  it("makes short segments chips, in order", () => {
    const parsed = parseDescription("bijelo · Hercegovina");
    expect(parsed.prose).toEqual([]);
    expect(parsed.chips).toEqual([
      { text: "bijelo", kind: "label" },
      { text: "Hercegovina", kind: "label" },
    ]);
    expect(parseDescription("domaći").chips).toEqual([{ text: "domaći", kind: "label" }]);
  });

  it("splits prose from the ABV chip and the label", () => {
    const parsed = parseDescription("S točionika, 0,5 l. · 5 % alk. · točeno");
    expect(parsed.prose).toEqual(["S točionika, 0,5 l."]);
    expect(parsed.chips).toEqual([
      { text: "5 % alk.", kind: "abv" },
      { text: "točeno", kind: "label" },
    ]);
  });

  it("detects zero alcohol in bs and en", () => {
    expect(parseDescription("Dark, ananas ili limun. · 0 % alkohola")).toEqual({
      prose: ["Dark, ananas ili limun."],
      chips: [{ text: "0 % alkohola", kind: "zero" }],
    });
    expect(parseDescription("0 % alcohol").chips[0]?.kind).toBe("zero");
    expect(parseDescription("0,0 % alk.").chips[0]?.kind).toBe("zero");
    expect(parseDescription("0% ABV").chips[0]?.kind).toBe("zero");
  });

  it("detects the ABV chip in bs and en", () => {
    expect(parseDescription("5 % ABV · on tap").chips).toEqual([
      { text: "5 % ABV", kind: "abv" },
      { text: "on tap", kind: "label" },
    ]);
    expect(parseDescription("4.5% alk.").chips[0]?.kind).toBe("abv");
    expect(parseDescription("12,5 % alkohola").chips[0]?.kind).toBe("abv");
  });

  it("reads the English examples", () => {
    expect(texts(parseDescription("from Tuzla · dark").chips)).toEqual(["from Tuzla", "dark"]);
    expect(texts(parseDescription("local").chips)).toEqual(["local"]);
    expect(texts(parseDescription("caffeine-free").chips)).toEqual(["caffeine-free"]);
  });

  it("treats sentence punctuation and long segments as prose", () => {
    expect(parseDescription("svježe!").prose).toEqual(["svježe!"]);
    expect(parseDescription("zar ne?").prose).toEqual(["zar ne?"]);
    const long = "a".repeat(41);
    expect(parseDescription(long).prose).toEqual([long]);
    expect(parseDescription("a".repeat(40)).chips).toHaveLength(1);
  });

  it("ignores empty segments and stray separators", () => {
    expect(texts(parseDescription(" · točeno · ").chips)).toEqual(["točeno"]);
    expect(texts(parseDescription("a ·  · b").chips)).toEqual(["a", "b"]);
    // A dot with no spaces around it is part of the word.
    expect(parseDescription("a·b").chips).toEqual([{ text: "a·b", kind: "label" }]);
  });
});

describe("splitSummary", () => {
  it("has no note without a line break", () => {
    expect(splitSummary("Kafa je Julius Meinl.")).toEqual({
      lead: "Kafa je Julius Meinl.",
      note: null,
    });
  });

  it("takes the last line as the note", () => {
    expect(splitSummary("Prvi red.\nZadnji red.")).toEqual({
      lead: "Prvi red.",
      note: "Zadnji red.",
    });
    expect(splitSummary("A.\nB.\nC.")).toEqual({ lead: "A. B.", note: "C." });
  });

  it("trims and ignores empty parts", () => {
    expect(splitSummary("  A.  \r\n\n  B.  \n ")).toEqual({ lead: "A.", note: "B." });
    expect(splitSummary("\nA.\n")).toEqual({ lead: "A.", note: null });
    expect(splitSummary("")).toEqual({ lead: null, note: null });
    expect(splitSummary(null)).toEqual({ lead: null, note: null });
  });

  it("collapses the breaks for the cards", () => {
    expect(oneLineSummary("A.\nB.")).toBe("A. B.");
    expect(oneLineSummary(" \n ")).toBeNull();
    expect(oneLineSummary(null)).toBeNull();
  });
});
