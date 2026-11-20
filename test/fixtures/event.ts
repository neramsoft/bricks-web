import type { RevalidationEvent } from "@probiz/sdk";

/** A revalidation webhook body as the CMS sends it. */
export function eventFixture(
  partial: Partial<RevalidationEvent> & { type: RevalidationEvent["type"] },
): RevalidationEvent {
  return {
    ids: [],
    paths: [],
    locales: [],
    sentAt: "2026-11-10T10:00:00.000Z",
    ...partial,
  };
}
