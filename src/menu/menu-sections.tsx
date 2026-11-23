import type { Messages } from "@/lib/messages";
import { fill } from "@/lib/format";
import { CmsImage } from "@/blocks/components/cms-image";
import { allergenNumber, usedAllergens } from "./allergens";
import { ChipMarks } from "./chips";
import { parseDescription } from "./description";
import { itemCountText, priceRows, searchText } from "./view-model";
import type { MenuItem, MenuSection } from "./view-model";

/**
 * One dish: the name (struck through, with its words, while it is not available), what marks it
 * (house recommendation, dietary labels), the allergen numbers of the legend, the description and
 * the price rows. A price row has its label (the size) when the dish has several.
 */
function Item({
  item,
  currency,
  showImage,
  showAllergens,
  locale,
  messages,
}: {
  item: MenuItem;
  currency: string | null;
  showImage: boolean;
  showAllergens: boolean;
  locale: string;
  messages: Messages;
}) {
  const m = messages.menu;
  const prices = priceRows(item, currency, locale);
  const { prose, chips } = parseDescription(item.description);
  const marks =
    chips.length > 0 ||
    item.dietary.length > 0 ||
    item.recommended ||
    item.unavailable ||
    item.spicy > 0;
  return (
    <li
      className="menu-item"
      data-search={searchText(item, m)}
      data-unavailable={item.unavailable ? "true" : undefined}
      data-recommended={item.recommended ? "true" : undefined}
    >
      <div>
        <p className="n">
          {item.unavailable ? <s>{item.name}</s> : item.name}
          {showAllergens && item.allergens.length > 0 ? (
            <span className="allergens">
              <span className="sr-only"> {m.allergensLabel}: </span>
              <span aria-hidden="true"> {item.allergens.map(allergenNumber).join(",")}</span>
              <span className="sr-only">
                {item.allergens.map((key) => m.allergenNames[key]).join(", ")}
              </span>
            </span>
          ) : null}
        </p>
        {prose.length > 0 ? <p className="d">{prose.join(" ")}</p> : null}
        {marks ? (
          <p className="tags">
            <ChipMarks chips={chips} />
            {item.unavailable ? <i className="gone">{m.unavailable}</i> : null}
            {item.recommended ? <i className="reco">{m.recommended}</i> : null}
            {item.spicy > 0 ? <i>{fill(m.spicy, { n: item.spicy })}</i> : null}
            {item.dietary.map((key) => (
              <i key={key} className="diet">
                {m.dietary[key]}
              </i>
            ))}
          </p>
        ) : null}
      </div>
      {prices.length > 0 ? (
        <ul className="prices">
          {prices.map((price, index) => (
            <li key={`${price.label ?? ""}-${index}`}>
              {price.label ? <span className="plabel">{price.label}</span> : null}
              <span>{price.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {showImage && item.image ? (
        <div className="thumb">
          <CmsImage image={item.image} sizes="96px" cover />
        </div>
      ) : null}
    </li>
  );
}

/** The sections of a menu with their dishes. */
export function MenuSections({
  sections,
  currency,
  showImages,
  showAllergens,
  headingLevel,
  idPrefix,
  locale,
  messages,
}: {
  sections: readonly MenuSection[];
  currency: string | null;
  showImages: boolean;
  showAllergens: boolean;
  headingLevel: 2 | 3;
  idPrefix: string;
  locale: string;
  messages: Messages;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <>
      {sections.map((section, index) => (
        <div
          key={section.id}
          className="menu-cat"
          data-cat
          role="group"
          aria-labelledby={`${idPrefix}-s${index}`}
        >
          <Heading id={`${idPrefix}-s${index}`} data-reveal>
            {section.title}
            <span>{itemCountText(section.items.length, locale, messages.menu)}</span>
          </Heading>
          {section.description ? <p className="menu-cat-intro">{section.description}</p> : null}
          <ul>
            {section.items.map((item) => (
              <Item
                key={item.id}
                item={item}
                currency={currency}
                showImage={showImages}
                showAllergens={showAllergens}
                locale={locale}
                messages={messages}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** What the numbers mean: the allergens the menu's dishes use, in the order of the legend, then the editor's note. */
export function MenuLegend({
  sections,
  allergenNote,
  showAllergens,
  messages,
}: {
  sections: readonly MenuSection[];
  allergenNote: string | null;
  showAllergens: boolean;
  messages: Messages;
}) {
  const items = sections.flatMap((section) => section.items);
  const allergens = showAllergens ? usedAllergens(items) : [];
  if (allergens.length === 0 && !allergenNote) return null;
  const m = messages.menu;
  return (
    <aside className="menu-legend" aria-label={m.allergensTitle}>
      {allergens.length > 0 ? (
        <>
          <p>
            <b>{m.allergensTitle}</b>
          </p>
          <ol>
            {allergens.map((key) => (
              <li key={key} value={allergenNumber(key)}>
                <span className="no">{allergenNumber(key)}</span>
                {m.allergenNames[key]}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {allergenNote ? <p className="menu-legend-note">{allergenNote}</p> : null}
    </aside>
  );
}
