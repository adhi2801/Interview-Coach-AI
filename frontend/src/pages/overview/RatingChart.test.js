import { describe, expect, it } from "vitest";
import { ratingTicks } from "./RatingChart";

describe("ratingTicks", () => {
  it("spaces round ticks evenly around the data", () => {
    expect(ratingTicks([1193, 1268])).toEqual([1175, 1200, 1225, 1250, 1275]);
    const ticks = ratingTicks([1200, 1203]);
    expect(ticks[0]).toBeLessThan(1200);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(1203);
    expect(new Set(ticks.slice(1).map((t, i) => t - ticks[i])).size).toBe(1);
  });
});
