// The CMS has no ABV or label fields on a menu item (docs/decisions/0004), so editors write them
// into the description as segments joined with " · ". This reads such a description: prose
// segments stay text, the short ones become chips, an alcohol segment becomes the ABV chip.

export type ChipKind = "abv" | "zero" | "label";

export interface Chip {
  text: string;
  kind: ChipKind;
}

export interface ParsedDescription {
  /** The prose segments, in order. */
  prose: string[];
  /** The chips, in order. */
  chips: Chip[];
}

/** A segment longer than this is prose even without a full stop. */
export const PROSE_MIN_LENGTH = 41;

const ALCOHOL = /^(\d+(?:[.,]\d+)?)\s?%\s?(?:alk\.?|alkohola|abv|alcohol)$/i;

function classify(segment: string): Chip | null {
  const alcohol = ALCOHOL.exec(segment);
  if (alcohol) {
    const value = Number.parseFloat((alcohol[1] ?? "").replace(",", "."));
    return { text: segment, kind: value === 0 ? "zero" : "abv" };
  }
  if (/[.!?]$/.test(segment) || segment.length >= PROSE_MIN_LENGTH) return null;
  return { text: segment, kind: "label" };
}

/** Splits a description on " ·" into prose and chips. Empty or missing text gives nothing. */
export function parseDescription(description: string | null | undefined): ParsedDescription {
  const result: ParsedDescription = { prose: [], chips: [] };
  if (!description) return result;
  const segments = description
    .split(/\s+·\s+/)
    .map((segment) => segment.replace(/^[\s·]+|[\s·]+$/g, ""))
    .filter((segment) => segment !== "");
  for (const segment of segments) {
    const chip = classify(segment);
    if (chip) result.chips.push(chip);
    else result.prose.push(segment);
  }
  return result;
}
