import type { BlockType } from "@probiz/sdk";

/**
 * A block that passed the check (blocks/parse.ts): the public data of the API with the schema's
 * defaults filled in. The typed shape of each block's data comes with its component.
 */
export interface ParsedBlock {
  id: string;
  type: BlockType;
  anchorId: string | null;
  data: Record<string, unknown>;
}
