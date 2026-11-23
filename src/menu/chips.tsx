import type { Chip } from "./description";

/** The chips of a description as `<i>` marks: `abv` and `zero` for the alcohol segment. */
export function ChipMarks({ chips }: { chips: readonly Chip[] }) {
  return chips.map((chip, index) => (
    <i
      key={`${chip.text}-${index}`}
      className={chip.kind === "label" ? undefined : chip.kind}
      data-chip={chip.kind}
    >
      {chip.text}
    </i>
  ));
}
