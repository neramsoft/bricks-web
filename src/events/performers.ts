import { getEventData } from "@/lib/data";
import { slugOfHref, splitEvents, type EventSummary } from "./view-model";

/**
 * The names of the performers of the event the wide card shows. The list's summary has none
 * (docs/decisions/0002, G7), so they come from the full event, which only an event with a page of
 * its own has. An event without one, or one that cannot be read, shows no "Svira" line.
 */
export async function featuredPerformers(
  events: readonly EventSummary[],
  locale: string,
): Promise<string[]> {
  const { first } = splitEvents(events);
  const slug = first ? slugOfHref(first.href) : null;
  if (!slug) return [];
  const event = await getEventData(slug, locale);
  return (event?.performers ?? []).map((performer) => performer.name).filter(Boolean);
}
