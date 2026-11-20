import Link from "next/link";
import type { PublicMenuItem } from "@probiz/sdk";

/** The items of a CMS menu, with their children. Links to other sites are plain anchors. */
export function MenuList({ items }: { items: readonly PublicMenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-none p-0">
      {items.map((item) => (
        <li key={item.id}>
          {item.external ? (
            <a
              href={item.href}
              {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {item.label}
            </a>
          ) : (
            <Link href={item.href} {...(item.openInNewTab ? { target: "_blank" } : {})}>
              {item.label}
            </Link>
          )}
          <MenuList items={item.children} />
        </li>
      ))}
    </ul>
  );
}
