import { describe, expect, it } from "vitest";
import { itemHeading } from "./heading-level";

describe("itemHeading", () => {
  it("puts the items one level below the block's h2", () => {
    expect(itemHeading(true)).toBe("h3");
    expect(itemHeading(true, 2)).toBe("h4");
  });

  it("starts the items at h2 when the block has no heading, never skipping a level", () => {
    expect(itemHeading(false)).toBe("h2");
    expect(itemHeading(false, 2)).toBe("h3");
  });
});
