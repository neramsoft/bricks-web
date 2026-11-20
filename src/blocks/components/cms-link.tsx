import Link from "next/link";
import type { ReactNode } from "react";
import { isInternal, linkHref, opensInNewTab } from "../links";
import type { ResolvedButton, ResolvedLink } from "../types";

/**
 * A link of a block. The API resolves the address (a page link follows renames), so a link whose
 * target is not live has none: it is drawn as plain text, never as a dead link.
 */
export function CmsLink({
  link,
  className,
  children,
}: {
  link: ResolvedLink | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const href = linkHref(link);
  if (!href) return <span className={className}>{children}</span>;
  if (opensInNewTab(link)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  if (isInternal(href)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const VARIANT_CLASS = { primary: "btn", secondary: "btn quiet", ghost: "textlink" } as const;

/** The buttons of a block; a button whose link has no address is left out. */
export function Buttons({
  buttons,
  className = "actions",
}: {
  buttons: readonly ResolvedButton[] | undefined;
  className?: string;
}) {
  const live = (buttons ?? []).filter((button) => linkHref(button.link) !== null);
  if (live.length === 0) return null;
  return (
    <div className={className}>
      {live.map((button, index) => (
        <CmsLink
          key={index}
          link={button.link}
          className={VARIANT_CLASS[button.variant ?? "primary"] ?? VARIANT_CLASS.primary}
        >
          {button.label}
        </CmsLink>
      ))}
    </div>
  );
}
