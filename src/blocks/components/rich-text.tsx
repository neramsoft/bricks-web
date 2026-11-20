import { Fragment, type ReactNode } from "react";
import type { PublicImage, RichText, RichTextNode } from "@probiz/sdk";
import { CmsImage } from "./cms-image";
import { CmsLink } from "./cms-link";
import type { ResolvedLink } from "../types";

// Rich text is a tree (ProseMirror JSON checked against an allow-list by @probiz/blocks), drawn as
// elements here and never as HTML, so stored text cannot carry markup. A node this renderer does
// not know is skipped, not drawn as an error.

type Mark = NonNullable<RichTextNode["marks"]>[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function applyMarks(text: string, marks: readonly Mark[] | undefined): ReactNode {
  let node: ReactNode = text;
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        node = <strong>{node}</strong>;
        break;
      case "italic":
        node = <em>{node}</em>;
        break;
      case "underline":
        node = <u>{node}</u>;
        break;
      case "strike":
        node = <s>{node}</s>;
        break;
      case "code":
        node = <code>{node}</code>;
        break;
      case "link":
        node = <CmsLink link={mark.attrs?.link as ResolvedLink | undefined}>{node}</CmsLink>;
        break;
    }
  }
  return node;
}

function Children({ nodes, sizes }: { nodes: readonly RichTextNode[] | undefined; sizes: string }) {
  return (
    <>
      {(nodes ?? []).map((node, index) => (
        <Node key={index} node={node} sizes={sizes} />
      ))}
    </>
  );
}

function Node({ node, sizes }: { node: RichTextNode; sizes: string }): ReactNode {
  switch (node.type) {
    case "text":
      return <Fragment>{applyMarks(node.text ?? "", node.marks)}</Fragment>;
    case "hardBreak":
      return <br />;
    case "paragraph":
      return (
        <p>
          <Children nodes={node.content} sizes={sizes} />
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level);
      const Tag = level === 3 ? "h3" : level === 4 ? "h4" : "h2";
      return (
        <Tag>
          <Children nodes={node.content} sizes={sizes} />
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul>
          <Children nodes={node.content} sizes={sizes} />
        </ul>
      );
    case "orderedList": {
      const start = Number(node.attrs?.start);
      return (
        <ol {...(Number.isInteger(start) && start > 1 ? { start } : {})}>
          <Children nodes={node.content} sizes={sizes} />
        </ol>
      );
    }
    case "listItem":
      return (
        <li>
          <Children nodes={node.content} sizes={sizes} />
        </li>
      );
    case "blockquote":
      return (
        <blockquote>
          <Children nodes={node.content} sizes={sizes} />
        </blockquote>
      );
    case "horizontalRule":
      return <hr />;
    case "image": {
      const attrs = node.attrs;
      const image =
        isRecord(attrs) && isRecord(attrs.image) ? (attrs.image as unknown as PublicImage) : null;
      if (!image) return null;
      const caption =
        typeof attrs?.caption === "string" && attrs.caption ? attrs.caption : image.caption;
      return (
        <figure className="figure">
          <CmsImage image={image} sizes={sizes} />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

const hasContent = (content: RichText | null | undefined): content is RichText =>
  !!content && Array.isArray(content.content) && content.content.length > 0;

/** Draws a rich text document. `sizes` is the width an image in the text gets. */
export function RichTextView({
  content,
  className = "prose",
  sizes = "(min-width: 1024px) 720px, 100vw",
}: {
  content: RichText | null | undefined;
  className?: string;
  sizes?: string;
}) {
  if (!hasContent(content)) return null;
  return (
    <div className={className}>
      <Children nodes={content.content} sizes={sizes} />
    </div>
  );
}
