import { describe, expect, it } from "vitest";
import { stepIndex, swipeStep } from "./lightbox-nav";

describe("stepIndex", () => {
  it("moves to the next and the previous picture", () => {
    expect(stepIndex(2, 1, 13)).toBe(3);
    expect(stepIndex(2, -1, 13)).toBe(1);
  });
  it("wraps around at both ends", () => {
    expect(stepIndex(12, 1, 13)).toBe(0);
    expect(stepIndex(0, -1, 13)).toBe(12);
  });
  it("stays put with one picture and survives an empty list", () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});

describe("swipeStep", () => {
  it("goes next on a swipe left and previous on a swipe right", () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(80, -5)).toBe(-1);
  });
  it("ignores a short swipe", () => {
    expect(swipeStep(-49, 0)).toBe(0);
    expect(swipeStep(50, 0)).toBe(-1);
  });
  it("ignores a mostly vertical swipe (a scroll)", () => {
    expect(swipeStep(-60, 90)).toBe(0);
  });
});
