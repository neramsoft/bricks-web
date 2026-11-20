import { validateBlock, type BlockType, type PublicBlock } from "@probiz/sdk";
import type { ParsedBlock } from "./types";

// Which blocks the page draws. The public answer holds what the editor saved, with the API's
// resolutions next to it : a block of a type this site has no component
// for, or whose data no longer fits its schema, is left out with a warning (in development only)
// and never breaks the page.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A property named `mediaId` or ending in `MediaId` is a media reference (the convention of @probiz/blocks). */
const isMediaKey = (key: string): boolean => key === "mediaId" || key.endsWith("MediaId");
/** Where the API puts the resolved image: `mediaId` gives `image`, `darkMediaId` gives `darkImage`. */
const imageKey = (key: string): string =>
  key === "mediaId" ? "image" : `${key.slice(0, -"MediaId".length)}Image`;

const LINK_TYPES = new Set(["page", "url", "email", "phone", "anchor"]);
/** What a block gets from settings and from the blog, at the top of its data (not part of the stored block). */
const ADDED_AT_TOP = new Set([
  "hours",
  "info",
  "posts",
  // The records of the module blocks.
  "services",
  "members",
  "testimonials",
  "average",
  "groups",
  // The records of the portfolio and gallery blocks.
  "projects",
  "gallery",
  "galleries",
  // The records of the locations and careers blocks.
  "locations",
  "jobs",
  // The records of the catalog and pricing blocks.
  "products",
  "categories",
  "table",
  // The records of the events and bookings blocks.
  "events",
  "settings",
  // The records of the menu and listings blocks.
  "menu",
  "menus",
  "listings",
  "listHref",
  "filters",
  "search",
  // The lists of the newsletter sign-up.
  "lists",
  // The human check of the sign-up.
  "captcha",
]);

/** The stored form of a public block's data: the resolutions the API added are taken out again. */
export function stripResolved(value: unknown, top = true): unknown {
  if (Array.isArray(value)) return value.map((item) => stripResolved(item, false));
  if (!isRecord(value)) return value;
  const resolved = new Set(Object.keys(value).filter(isMediaKey).map(imageKey));
  const isLink = typeof value.type === "string" && LINK_TYPES.has(value.type);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (resolved.has(key)) continue;
    if (isLink && key === "href") continue;
    if (top && ADDED_AT_TOP.has(key)) continue;
    if (key === "attrs" && value.type === "image" && isRecord(child)) {
      // An image in rich text: its resolved image sits in `attrs`.
      const { image: _image, ...attrs } = child;
      void _image;
      out[key] = attrs;
      continue;
    }
    out[key] = stripResolved(child, false);
  }
  return out;
}

function describe(issues: ReadonlyArray<{ path: (string | number)[]; message: string }>): string {
  return issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "block"}: ${issue.message}`)
    .join("; ");
}

type Warn = (message: string) => void;
const defaultWarn: Warn = (message) => {
  // Visitors' logs stay quiet; an editor's mistake shows while the site is being worked on.
  if (process.env.NODE_ENV !== "production") console.warn(`[blocks] ${message}`);
};

/**
 * Checks one public block against its schema and gives it its defaults. The checked copy is the
 * stored block (migrated to the current version); what is drawn is the public data with the
 * top-level defaults filled in, because only the public data has the images and addresses.
 * Returns null, with a warning, for an unknown type or data that does not fit.
 */
export function parseBlock(block: PublicBlock, warn: Warn = defaultWarn): ParsedBlock | null {
  const raw = isRecord(block.data) ? block.data : {};
  const result = validateBlock({
    id: block.id,
    type: block.type,
    version: block.version,
    anchorId: block.anchorId,
    data: stripResolved(raw),
  });
  if (!result.ok) {
    const unknown = result.issues.some((issue) => issue.code === "unknown_type");
    warn(
      unknown
        ? `skipped block ${block.id}: unknown type "${block.type}"`
        : `skipped block ${block.id} (${block.type}): ${describe(result.issues)}`,
    );
    return null;
  }
  const checked = result.block.data as Record<string, unknown>;
  // Defaults and migrated keys the stored data may lack; everything the API resolved stays.
  const data: Record<string, unknown> = { ...checked, ...raw };
  return {
    id: block.id,
    type: block.type as BlockType,
    anchorId: block.anchorId ?? null,
    data,
  };
}

/** The blocks of a page that can be drawn, in order. */
export function parseBlocks(
  blocks: readonly PublicBlock[],
  warn: Warn = defaultWarn,
): ParsedBlock[] {
  const parsed: ParsedBlock[] = [];
  for (const block of blocks) {
    try {
      const result = parseBlock(block, warn);
      if (result) parsed.push(result);
    } catch (error) {
      warn(`skipped block ${block.id} (${block.type}): ${String(error)}`);
    }
  }
  return parsed;
}
