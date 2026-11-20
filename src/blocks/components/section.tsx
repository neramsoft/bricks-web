import type { ReactNode } from "react";

/** A block's section: the anchor to link to, the heading as its label, the page's gutter. */
export function Section({
  id,
  anchorId,
  heading,
  className = "",
  wrap = true,
  children,
}: {
  id: string;
  anchorId: string | null;
  heading?: string | undefined;
  className?: string;
  /** Inside the page's gutter (default); false for a block that draws its own. */
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={anchorId ?? undefined}
      aria-labelledby={heading ? `${id}-h` : undefined}
      className={`block ${className}`.trim()}
      data-block-id={id}
    >
      {wrap ? <div className="wrap">{children}</div> : children}
    </section>
  );
}

/** The heading of a section (an `h2`) with its intro. */
export function SectionHead({
  id,
  heading,
  intro,
}: {
  id: string;
  heading?: string | undefined;
  intro?: string | undefined;
}) {
  if (!heading && !intro) return null;
  return (
    <div className="block-head">
      {heading ? (
        <h2 className="h-section" id={`${id}-h`} data-reveal>
          {heading}
        </h2>
      ) : null}
      {intro ? (
        <p className="block-intro" data-reveal>
          {intro}
        </p>
      ) : null}
    </div>
  );
}
