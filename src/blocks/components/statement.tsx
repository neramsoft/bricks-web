import { CmsLink } from "./cms-link";
import type { BlockProps } from "./props";

export function Statement({ block }: BlockProps<"statement">) {
  const d = block.data;
  return (
    <section
      id={block.anchorId ?? undefined}
      className={`statement wrap${d.align === "center" ? " center" : ""}`}
      data-block-id={block.id}
    >
      {d.eyebrow ? <p className="eyebrow">{d.eyebrow}</p> : null}
      <p className="statement-text" data-reveal>
        {d.text}
      </p>
      {d.link && d.linkLabel ? (
        <CmsLink link={d.link} className="textlink">
          {d.linkLabel}
        </CmsLink>
      ) : null}
    </section>
  );
}
