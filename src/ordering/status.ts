import type { OrderStatus } from "./types";

// The order's status as the guest's three steps (the prototype's Primljena, U pripremi, Poslužena).
// NAPLACENA (paid) and OTKAZANA (cancelled) are final.

export const STEPS = ["NOVA", "U_PRIPREMI", "POSLUZENA"] as const;
export type StepKey = (typeof STEPS)[number];
export type StepState = "done" | "now" | "todo";

export const isFinal = (status: OrderStatus): boolean =>
  status === "NAPLACENA" || status === "OTKAZANA";

/**
 * The state of each step. Paid means every step is done; cancelled shows the steps as they were
 * not reached (all "todo", the page shows the reason instead).
 */
export function stepStates(status: OrderStatus): Array<{ key: StepKey; state: StepState }> {
  const at = STEPS.indexOf(status as StepKey);
  return STEPS.map((key, index) => {
    if (status === "OTKAZANA") return { key, state: "todo" as const };
    if (status === "NAPLACENA") return { key, state: "done" as const };
    return { key, state: index < at ? "done" : index === at ? "now" : "todo" };
  });
}
