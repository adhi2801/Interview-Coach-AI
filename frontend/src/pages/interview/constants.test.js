import { describe, expect, it } from "vitest";
import { computeTimeLimit } from "./constants";

describe("computeTimeLimit", () => {
  it("gives each kind of question the time a real loop would", () => {
    expect(computeTimeLimit("", [], "system_design")).toBe(12 * 60);
    expect(computeTimeLimit("", [], "Behavioral")).toBe(5 * 60);
    expect(computeTimeLimit("", [], "algorithms")).toBe(8 * 60);
  });

  it("adds reading time for long scenarios and constraints, capped at three minutes", () => {
    expect(computeTimeLimit("x".repeat(300), ["a", "b"], "system_design")).toBe(12 * 60 + 30 + 40);
    expect(computeTimeLimit("x".repeat(10_000), Array(20).fill("c"), "system_design")).toBe(15 * 60);
  });
});
