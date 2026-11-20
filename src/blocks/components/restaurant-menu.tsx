import Link from "next/link";
import { availabilityText } from "@/menu/availability";
import { MenuSearch } from "@/menu/menu-search";
import { MenuLegend, MenuSections } from "@/menu/menu-sections";
import { RichTextView } from "./rich-text";
import type { BlockProps } from "./props";

/**
 * A menu (or some of its sections) in the prototype's chapter layout: the lead on the left (the
 * block's heading, the menu's summary and the hours it is served), the search and the dishes on
 * the right. The list is drawn complete on the server; the search box only hides what does not
 * match. A block the API left without a menu (a draft, outside its dates) draws nothing.
 */
export function RestaurantMenu({ block, ctx }: BlockProps<"restaurantMenu">) {
  const d = block.data;
  const menu = d.menu;
  if (!menu || menu.sections.length === 0) return null;
  const { messages, locale } = ctx;
  const when = availabilityText(menu.availability, locale, messages);
  const showAllergens = d.showAllergens ?? true;
  const layout = d.layout ?? "list";
  const hasNote = menu.note && Array.isArray(menu.note.content) && menu.note.content.length > 0;
  const listId = `${block.id}-list`;
  const heading = d.heading ?? menu.title;
  return (
    <section
      id={block.anchorId ?? undefined}
      aria-labelledby={`${block.id}-h`}
      className={`chapter wrap${ctx.menuIndex % 2 === 1 ? " alt" : ""}${layout === "cards" ? " cards" : ""}`}
      data-block-id={block.id}
    >
      <div className="chapter-lead">
        <h2 className="h-chapter" id={`${block.id}-h`} data-reveal>
          {heading}
        </h2>
        {menu.summary ? <p data-reveal>{menu.summary}</p> : null}
        {when ? (
          <p className="when" data-reveal>
            {when}
          </p>
        ) : null}
      </div>
      <div className="chapter-body">
        <MenuSearch
          targetId={listId}
          label={messages.menu.search}
          placeholder={messages.menu.searchPlaceholder}
          empty={messages.menu.noResults}
        />
        <div id={listId}>
          <MenuSections
            sections={menu.sections}
            currency={menu.currency}
            showImages={d.showImages ?? true}
            showAllergens={showAllergens}
            headingLevel={3}
            idPrefix={`${block.id}-m`}
            locale={locale}
            messages={messages}
          />
        </div>
        {hasNote && menu.note ? (
          <div className="menu-legend-note">
            <RichTextView content={menu.note} />
          </div>
        ) : null}
        <MenuLegend
          sections={menu.sections}
          allergenNote={menu.allergenNote}
          showAllergens={showAllergens}
          messages={messages}
        />
        {menu.href ? (
          <p>
            <Link className="textlink" href={menu.href}>
              {messages.menu.viewMenu}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
