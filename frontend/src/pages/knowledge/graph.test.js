import { describe, expect, it } from "vitest";
import {
  ancestors, blockedByGaps, buildGraph, descendants, humanize, learningPath, readyTopics, summarize,
} from "./graph";

// arrays -> hash_maps -> caching -> distributed_systems, plus a side branch.
const TOPICS = [
  { name: "arrays", category: "data_structures", difficulty: 1, status: "passed", prerequisites: [] },
  { name: "hash_maps", category: "data_structures", difficulty: 4, status: "gap", urgency: "high", prerequisites: ["arrays"] },
  { name: "caching", category: "system_design", difficulty: 5, status: "unattempted", prerequisites: ["hash_maps"] },
  { name: "distributed_systems", category: "system_design", difficulty: 8, status: "locked", prerequisites: ["caching", "networking_basics"] },
  { name: "networking_basics", category: "networking", difficulty: 2, status: "passed", prerequisites: [] },
  { name: "tcp", category: "networking", difficulty: 3, status: "unattempted", prerequisites: ["networking_basics"] },
  { name: "star", category: "behavioral", difficulty: 1, status: "weird-status", prerequisites: ["does_not_exist"] },
];

describe("knowledge graph", () => {
  const g = buildGraph(TOPICS);

  it("layers topics by their longest prerequisite chain", () => {
    expect(g.depth.get("arrays")).toBe(0);
    expect(g.depth.get("hash_maps")).toBe(1);
    expect(g.depth.get("caching")).toBe(2);
    expect(g.depth.get("distributed_systems")).toBe(3);
    expect(g.maxDepth).toBe(3);
  });

  it("orders lanes the way the curriculum builds, and places each node in its column", () => {
    expect(g.lanes.map((l) => l.category)).toEqual(["data_structures", "networking", "system_design", "behavioral"]);
    const sd = g.lanes.find((l) => l.category === "system_design");
    expect(sd.columns[2].map((t) => t.name)).toEqual(["caching"]);
    expect(sd.columns[3].map((t) => t.name)).toEqual(["distributed_systems"]);
  });

  it("cleans bad data instead of drawing it", () => {
    expect(g.byName.get("star").prerequisites).toEqual([]);   // dangling edge dropped
    expect(g.byName.get("star").status).toBe("unattempted");  // unknown status
  });

  it("finds full chains in both directions", () => {
    expect([...ancestors(g, "distributed_systems")].sort()).toEqual(["arrays", "caching", "hash_maps", "networking_basics"]);
    expect([...descendants(g, "hash_maps")].sort()).toEqual(["caching", "distributed_systems"]);
  });

  it("gives a learning path shallowest-first, ending at the topic", () => {
    expect(learningPath(g, "caching")).toEqual(["arrays", "hash_maps", "caching"]);
  });

  it("knows what is ready now and what each gap is holding back", () => {
    expect(readyTopics(g).map((t) => t.name).sort()).toEqual(["star", "tcp"]);
    expect([...blockedByGaps(g)].sort()).toEqual(["caching", "distributed_systems"]);
    expect(summarize(g)).toMatchObject({ total: 7, passed: 2, gaps: 1, locked: 1, blocked: 2, ready: 2 });
  });

  it("survives a prerequisite cycle", () => {
    const cyclic = buildGraph([
      { name: "a", category: "x", prerequisites: ["b"] },
      { name: "b", category: "x", prerequisites: ["a"] },
    ]);
    expect(Number.isFinite(cyclic.maxDepth)).toBe(true);
    expect(ancestors(cyclic, "a")).toEqual(new Set(["b", "a"]));
  });

  it("humanizes snake_case names", () => {
    expect(humanize("binary_search_trees")).toBe("Binary search trees");
    expect(humanize("oop")).toBe("OOP");
    expect(humanize("sql_injection")).toBe("SQL injection");
    expect(humanize("rest_api_design")).toBe("REST API design");
    expect(humanize("grpc")).toBe("gRPC");
  });
});
