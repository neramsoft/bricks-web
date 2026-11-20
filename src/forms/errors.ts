import type { ApiIssue } from "@probiz/sdk";
import type { Messages } from "@/lib/messages";
import type { FailureKind, FieldProblem } from "./outcome";

// From what the API says went wrong to what the page says. The API's codes are the contract; its
// English messages are never shown, so the site's own texts can be in the visitor's language.

/**
 * The first problem of each field, and whether some problem belongs to no field. A problem of a
 * key the form does not have (a definition that changed between the page and the send) counts as
 * general, so the visitor is told something is wrong even though no field can show it.
 */
export function problemsFrom(
  issues: readonly ApiIssue[],
  knownKeys: ReadonlySet<string>,
): { fields: Record<string, FieldProblem>; general: boolean } {
  const fields: Record<string, FieldProblem> = {};
  let general = false;
  for (const issue of issues) {
    const key = /^values\.(.+)$/.exec(issue.path)?.[1];
    if (!key || !knownKeys.has(key)) {
      general = true;
      continue;
    }
    if (key in fields) continue;
    fields[key] = {
      code: issue.code,
      ...(issue.minimum !== undefined ? { min: issue.minimum } : {}),
      ...(issue.maximum !== undefined ? { max: issue.maximum } : {}),
    };
  }
  return { fields, general };
}

/** The sentence under a field for a problem. */
export function describeProblem(problem: FieldProblem, messages: Messages["form"]): string {
  const p = messages.problems;
  switch (problem.code) {
    case "required":
      return p.required;
    case "too_short":
      return p.tooShort;
    case "too_long":
      return p.tooLong;
    case "invalid_email":
    case "invalid_date":
    case "invalid_enum":
    case "out_of_range":
      return p.invalid;
    default:
      return p.other;
  }
}

/** The sentence for something that went wrong with the send itself. */
export function describeFailure(kind: FailureKind, messages: Messages["form"]): string {
  return messages.failed[kind];
}
