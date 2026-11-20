// What a submission came to. The page's script gets it as JSON; a browser without script is sent
// to a thank-you page that names it in the address (`?s=sent`, `?s=invalid`, `?s=<failure>`).

/** A problem the API found with one field: its code (and limits) is what the page translates. */
export interface FieldProblem {
  code: string;
  min?: number;
  max?: number;
}

export type FailureKind =
  "captcha" | "token" | "rate_limited" | "not_found" | "js_required" | "unavailable";

export type FormOutcome =
  | { status: "sent"; message: string }
  /** `fields` by field key; `general` when a problem belongs to no field. */
  | { status: "invalid"; fields: Record<string, FieldProblem>; general: boolean }
  | { status: "failed"; kind: FailureKind; retryAfterSec?: number };

/** What the visitor typed, to put back: a text, the ticked options, a ticked consent box. */
export type EnteredValues = Record<string, string | string[] | boolean>;

const FAILURES: readonly FailureKind[] = [
  "captcha",
  "token",
  "rate_limited",
  "not_found",
  "js_required",
  "unavailable",
];

/** The word that names an outcome in the thank-you page's address. */
export const outcomeWord = (outcome: FormOutcome): string =>
  outcome.status === "failed" ? outcome.kind : outcome.status;

/** The outcome a thank-you page's `s` names; anything else is nobody's outcome. */
export function outcomeFromWord(word: unknown): "sent" | "invalid" | FailureKind | null {
  if (word === "sent" || word === "invalid") return word;
  return FAILURES.find((kind) => kind === word) ?? null;
}

/** The HTTP status the page's script gets for an outcome. */
export function outcomeStatus(outcome: FormOutcome): number {
  if (outcome.status === "sent") return 200;
  if (outcome.status === "invalid") return 422;
  switch (outcome.kind) {
    case "captcha":
    case "token":
    case "js_required":
      return 400;
    case "rate_limited":
      return 429;
    case "not_found":
      return 404;
    case "unavailable":
      return 502;
  }
}
