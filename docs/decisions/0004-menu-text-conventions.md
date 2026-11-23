# 0004: Menu text conventions (chips and the muted line)

**Status:** Accepted for the theme (2026-11-23); the CMS fields below are proposals for the owner.

## Context

The prototype's menu chapters have two things the CMS 1.0.0 has no field for:

1. A muted line under the lead paragraph of a chapter ("Kafu točimo od otvaranja do zatvaranja, ne samo ujutro."). The `restaurantMenu` block has the menu's `summary` and nothing else.
2. Small labels under a dish: the ABV ("5 % alk."), the zero-alcohol mark and words like "točeno" or "domaći". A menu item has a description, five dietary marks and allergens, but no ABV and no free labels (G5 in docs/decisions/0002).

The theme does not change the CMS (CLAUDE.md, working agreement 6), so both are conventions on the text the CMS already sends. They are written to degrade well: a description or summary written without the convention reads as plain text.

## Decision

### 1. The muted line: a line break in the menu's summary

- The summary is split on line breaks (`\n`, `\r\n`), each part trimmed, empty parts dropped.
- One part: it is the lead paragraph, as before.
- Two or more parts: the text before the last break (joined with a space) is the lead paragraph; the last line is the muted line (`.lead-note`, the style of the availability line `.when`: muted, 15 px, 16 px above). The availability line, when the menu has one, follows below it.
- The menu cards (`restaurantMenuList`) show the summary as one paragraph: the breaks become spaces.

Code: `src/menu/summary.ts`, `src/blocks/components/restaurant-menu.tsx`.

### 2. Chips: segments in an item's description

A description is split on `·` (a middle dot with a space on each side), each segment trimmed, empty ones dropped.

- A segment that ends with `.`, `!` or `?`, or has 41 characters or more, is prose. Prose segments are joined with a space and drawn as the description line.
- An alcohol segment, `<number> % alk.|alkohola|ABV|alcohol` (comma or point decimal, optional spaces, any case), is the ABV chip (`.abv`: raised background). A value of 0 is the zero chip (`.zero`: the positive colour on the page background). The alcohol test comes before the prose test, so "5 % alk." is a chip although it ends with a full stop.
- Every other segment is a chip, in the written order, drawn like the prototype's `.item .t i` (12 px, semibold, 3 px 8 px, surface background, raised on the dark chapter).
- The chips sit in the same row as the recommendation, dietary and spicy marks, before them.
- The menu search reads the whole description, so a dish is found by its chip words.
- The table-ordering menu draws the same chips under the dish (`.ord-chips`).

Code: `src/menu/description.ts`, `src/menu/chips.tsx`, `src/menu/menu-sections.tsx`, `src/ordering/order-menu.tsx`.

## How editors write it

Summary (menu, any language):

```
Kafa je Julius Meinl: espresso, cappuccino, macchiato.
Kafu točimo od otvaranja do zatvaranja, ne samo ujutro.
```

Item description: short labels with no full stop, joined by `·`. Prose keeps its full stop.

| Written                                    | Shown                                            |
| ------------------------------------------ | ------------------------------------------------ |
| `5 % alk. · točeno`                        | chips "5 % alk." (ABV) and "točeno"              |
| `S točionika, 0,5 l. · 5 % alk. · točeno`  | the line "S točionika, 0,5 l." and the two chips |
| `Dark, ananas ili limun. · 0 % alkohola`   | the line and the green "0 % alkohola" chip       |
| `bijelo · Hercegovina`                     | two chips                                        |
| `5 % ABV · on tap`, `0 % alcohol`, `local` | the English equivalents                          |

A label that ends with a full stop, or is longer than 40 characters, becomes text, not a chip. Write "domaći", not "Domaći.".

## Proposed CMS changes (also G11 and G12 in docs/decisions/0002)

- Menu items: an `abv` number and a free `labels` list. The theme then reads them instead of parsing the description.
- The `restaurantMenu` block: a `note` line next to the summary.

When these exist the parsers stay as a fallback for a description or summary that holds the old convention, until the editors have moved their content.

## Consequences

- A description that holds `·` for another reason gets chips; editors are told above.
- The search text and the structured data are unchanged: they use the description as written.
