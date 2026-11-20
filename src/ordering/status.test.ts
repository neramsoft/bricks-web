import { describe, expect, it } from "vitest";
import { isFinal, stepStates } from "./status";

const states = (status: Parameters<typeof stepStates>[0]) => stepStates(status).map((s) => s.state);

describe("status to steps", () => {
  it("walks Primljena, U pripremi, Poslužena", () => {
    expect(states("NOVA")).toEqual(["now", "todo", "todo"]);
    expect(states("U_PRIPREMI")).toEqual(["done", "now", "todo"]);
    expect(states("POSLUZENA")).toEqual(["done", "done", "now"]);
  });

  it("paid completes every step, cancelled reaches none", () => {
    expect(states("NAPLACENA")).toEqual(["done", "done", "done"]);
    expect(states("OTKAZANA")).toEqual(["todo", "todo", "todo"]);
  });

  it("knows the final statuses", () => {
    expect(["NOVA", "U_PRIPREMI", "POSLUZENA"].map((s) => isFinal(s as never))).toEqual([
      false,
      false,
      false,
    ]);
    expect(isFinal("NAPLACENA")).toBe(true);
    expect(isFinal("OTKAZANA")).toBe(true);
  });
});
