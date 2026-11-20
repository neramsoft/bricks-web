import Link from "next/link";
import { fill } from "@/lib/format";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";

/** The menus that are on now as cards (the menu module's list); a menu without a page of its own is a card without a link. */
export function RestaurantMenuList({ block, ctx }: BlockProps<"restaurantMenuList">) {
  const d = block.data;
  const menus = d.menus ?? [];
  if (menus.length === 0) return null;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
      <ul className="menu-cards">
        {menus.map((menu) => {
          const body = (
            <>
              <b>{menu.title}</b>
              <span>
                {menu.summary ?? fill(ctx.messages.blocks.galleryItems, { n: menu.itemCount })}
              </span>
            </>
          );
          return (
            <li key={menu.id} data-reveal>
              {menu.href ? (
                <Link className="menu-card" href={menu.href}>
                  {body}
                </Link>
              ) : (
                <div className="menu-card">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
