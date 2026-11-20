import type { CSSProperties } from "react";
import { CmsImage } from "./cms-image";
import { CmsLink } from "./cms-link";
import { Icon } from "./icon";
import { Section, SectionHead } from "./section";
import type { BlockProps } from "./props";

/** The CMS's four layouts, all drawn as bricks laid with the mortar between them. */
export function Features({ block }: BlockProps<"features">) {
  const d = block.data;
  const layout = d.layout ?? "grid";
  const columns = d.columns ?? 3;
  return (
    <Section id={block.id} anchorId={block.anchorId} heading={d.heading}>
      <SectionHead id={block.id} heading={d.heading} intro={d.intro} />
      <ul
        className={`tiles ${layout}`}
        style={{ "--cols": layout === "list" ? 1 : columns } as CSSProperties}
      >
        {d.items.map((item, index) => {
          const image = item.image ?? item.darkImage;
          return (
            <li
              key={index}
              className={`tile${item.highlight ? " highlight" : ""}${item.featured ? " featured" : ""}`}
              data-reveal
            >
              {layout === "steps" ? <span className="tile-step">{index + 1}</span> : null}
              {item.eyebrow ? <p className="eyebrow">{item.eyebrow}</p> : null}
              <Icon name={item.icon} />
              {image ? <CmsImage image={image} sizes="(min-width: 901px) 33vw, 100vw" /> : null}
              <h3>{item.title}</h3>
              {item.text ? <p>{item.text}</p> : null}
              {item.tags && item.tags.length > 0 ? (
                <span className="tile-tags">
                  {item.tags.map((tag) => (
                    <i key={tag}>{tag}</i>
                  ))}
                </span>
              ) : null}
              {item.link && item.linkLabel ? (
                <CmsLink link={item.link} className="tile-link">
                  {item.linkLabel}
                </CmsLink>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
