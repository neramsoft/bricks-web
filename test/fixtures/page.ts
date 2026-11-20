import type { ApiComponents } from "@probiz/sdk";

type Schemas = ApiComponents["schemas"];

export type PageFixture = Schemas["PublicPage"];
export type BlockFixture = Schemas["PublicBlock"];
export type MenusFixture = Schemas["PublicMenus"];
export type SitemapItemFixture = Schemas["PublicSitemapItem"];

export const ID = "00000000-0000-4000-8000-000000000001";

/** A `GET /v1/public/pages` answer for a page below the home page. Override what a test needs. */
export function pageFixture(
  overrides: Omit<Partial<PageFixture>, "seo"> & { seo?: Partial<PageFixture["seo"]> } = {},
): PageFixture {
  const { seo, ...rest } = overrides;
  return {
    id: ID,
    blocks: [],
    seo: {
      title: "Meni",
      description: "Piće i hrana u Bricksu",
      canonicalUrl: null,
      ogImage: null,
      noindex: false,
      ...seo,
    },
    alternates: [
      { locale: "bs", path: "/meni", href: "/meni" },
      { locale: "en", path: "/menu", href: "/en/menu" },
    ],
    breadcrumbs: [{ title: "Meni", path: "/meni", href: "/meni" }],
    publishedAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z",
    locale: "bs",
    path: "/meni",
    href: "/meni",
    isHome: false,
    title: "Meni",
    preview: false,
    ...rest,
  };
}

export function blockFixture(
  type: string,
  data: Record<string, unknown> = {},
  overrides: Partial<BlockFixture> = {},
): BlockFixture {
  return { id: ID, version: 1, anchorId: null, type, data, ...overrides };
}

export function menusFixture(): MenusFixture {
  return {
    locale: "bs",
    menus: [
      {
        key: "header",
        name: "Header",
        items: [
          {
            id: ID,
            label: "Meni",
            href: "/meni",
            external: false,
            openInNewTab: false,
            children: [],
          },
        ],
      },
    ],
  };
}
