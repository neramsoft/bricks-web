import Link from "next/link";
import type { Crumb } from "@/lib/breadcrumbs";

/** The visible trail. The `BreadcrumbList` JSON-LD is built from the same crumbs. */
export function Breadcrumbs({ crumbs, label }: { crumbs: readonly Crumb[]; label: string }) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label={label}>
      <ol className="flex list-none flex-wrap gap-2 p-0">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex gap-2 not-first:before:content-['/']">
            {crumb.current ? (
              <span aria-current="page">{crumb.name}</span>
            ) : crumb.link === false ? (
              <span>{crumb.name}</span>
            ) : (
              <Link href={crumb.href}>{crumb.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
