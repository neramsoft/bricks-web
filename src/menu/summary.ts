// A menu's summary can carry a second, muted line (docs/decisions/0004): the text before the last
// line break is the lead paragraph, the last line is the note under it.

export interface SplitSummary {
  lead: string | null;
  note: string | null;
}

function lines(summary: string | null | undefined): string[] {
  return (summary ?? "")
    .split(/\r?\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** The lead paragraph and the muted line of a summary; no line break means a lead only. */
export function splitSummary(summary: string | null | undefined): SplitSummary {
  const parts = lines(summary);
  if (parts.length === 0) return { lead: null, note: null };
  if (parts.length === 1) return { lead: parts[0] ?? null, note: null };
  return { lead: parts.slice(0, -1).join(" "), note: parts[parts.length - 1] ?? null };
}

/** A summary as one paragraph, for the cards: the line breaks collapse into spaces. */
export function oneLineSummary(summary: string | null | undefined): string | null {
  const text = lines(summary).join(" ");
  return text === "" ? null : text;
}
