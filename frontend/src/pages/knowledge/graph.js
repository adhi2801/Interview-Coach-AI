// Pure graph logic for the knowledge map, built from /topics/status.
// Every topic lists its direct prerequisites; everything else (depth,
// dependents, chains, what's ready, what a gap blocks) is derived here.

export const STATUS = {
  passed: "passed",
  gap: "gap",
  locked: "locked",
  unattempted: "unattempted",
};

// Lane order: foundations first, then the way an interview loop usually
// builds up; unknown categories fall to the end alphabetically.
const LANE_ORDER = [
  "foundations", "data_structures", "algorithms", "software_design", "databases",
  "operating_systems", "networking", "system_design", "security", "machine_learning", "behavioral",
];

const ACRONYMS = {
  oop: "OOP", sql: "SQL", nosql: "NoSQL", tcp: "TCP", ip: "IP", udp: "UDP", http: "HTTP", https: "HTTPS",
  api: "API", apis: "APIs", rest: "REST", dns: "DNS", cdn: "CDN", cap: "CAP", acid: "ACID", os: "OS",
  cpu: "CPU", gpu: "GPU", ml: "ML", nlp: "NLP", cnn: "CNN", rnn: "RNN", llm: "LLM", star: "STAR",
  jwt: "JWT", oauth: "OAuth", tls: "TLS", ssl: "SSL", xss: "XSS", csrf: "CSRF", grpc: "gRPC", solid: "SOLID",
  websockets: "WebSockets",
  bfs: "BFS", dfs: "DFS", dp: "DP", lru: "LRU", io: "I/O", ci: "CI", cd: "CD", tf: "TF", idf: "IDF",
};

export function humanize(name = "") {
  const words = name.split("_").map((w) => ACRONYMS[w.toLowerCase()] ?? w.toLowerCase());
  const text = words.join(" ");
  return ACRONYMS[words[0]?.toLowerCase()] ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildGraph(rawTopics) {
  const byName = new Map();
  for (const t of rawTopics) {
    byName.set(t.name, {
      ...t,
      category: t.category || "other",
      status: STATUS[t.status] ? t.status : STATUS.unattempted,
      // Only edges to topics that exist: a dangling name can't be drawn.
      prerequisites: (t.prerequisites || []).filter((p) => p !== t.name),
    });
  }
  for (const t of byName.values()) t.prerequisites = t.prerequisites.filter((p) => byName.has(p));

  const dependents = new Map([...byName.keys()].map((n) => [n, []]));
  for (const t of byName.values()) for (const p of t.prerequisites) dependents.get(p).push(t.name);

  // Depth = longest prerequisite chain below a topic. Cycles (bad data)
  // are cut rather than recursing forever.
  const depth = new Map();
  const visiting = new Set();
  const depthOf = (name) => {
    if (depth.has(name)) return depth.get(name);
    if (visiting.has(name)) return 0;
    visiting.add(name);
    const prereqs = byName.get(name).prerequisites;
    const d = prereqs.length ? 1 + Math.max(...prereqs.map(depthOf)) : 0;
    visiting.delete(name);
    depth.set(name, d);
    return d;
  };
  for (const name of byName.keys()) depthOf(name);
  const maxDepth = Math.max(0, ...depth.values());

  const categories = [...new Set([...byName.values()].map((t) => t.category))].sort((a, b) => {
    const ia = LANE_ORDER.indexOf(a), ib = LANE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
  const lanes = categories.map((category) => {
    const columns = Array.from({ length: maxDepth + 1 }, () => []);
    for (const t of byName.values()) if (t.category === category) columns[depth.get(t.name)].push(t);
    for (const col of columns) col.sort((a, b) => (a.difficulty ?? 5) - (b.difficulty ?? 5) || a.name.localeCompare(b.name));
    return { category, columns, count: columns.reduce((n, c) => n + c.length, 0) };
  });

  return { byName, dependents, depth, maxDepth, lanes };
}

/** Every prerequisite below a topic, nearest first (breadth-first). */
export function ancestors(graph, name) {
  const seen = new Set();
  const queue = [...(graph.byName.get(name)?.prerequisites || [])];
  while (queue.length) {
    const n = queue.shift();
    if (seen.has(n)) continue;
    seen.add(n);
    queue.push(...graph.byName.get(n).prerequisites);
  }
  return seen;
}

/** Every topic that builds on this one, directly or indirectly. */
export function descendants(graph, name) {
  const seen = new Set();
  const queue = [...(graph.dependents.get(name) || [])];
  while (queue.length) {
    const n = queue.shift();
    if (seen.has(n)) continue;
    seen.add(n);
    queue.push(...graph.dependents.get(n));
  }
  return seen;
}

/** Learning order for a topic: its whole chain, shallowest first, then itself. */
export function learningPath(graph, name) {
  const chain = [...ancestors(graph, name)];
  chain.sort((a, b) => graph.depth.get(a) - graph.depth.get(b) || a.localeCompare(b));
  return [...chain, name];
}

/** Not yet attempted, and every prerequisite already shown. */
export function readyTopics(graph) {
  return [...graph.byName.values()].filter(
    (t) => t.status === STATUS.unattempted &&
      t.prerequisites.every((p) => graph.byName.get(p).status === STATUS.passed),
  );
}

/** Topics that sit downstream of at least one gap. */
export function blockedByGaps(graph) {
  const blocked = new Set();
  for (const t of graph.byName.values()) {
    if (t.status !== STATUS.gap) continue;
    for (const d of descendants(graph, t.name)) if (graph.byName.get(d).status !== STATUS.passed) blocked.add(d);
  }
  return blocked;
}

export function summarize(graph) {
  const all = [...graph.byName.values()];
  const count = (s) => all.filter((t) => t.status === s).length;
  return {
    total: all.length,
    passed: count(STATUS.passed),
    gaps: count(STATUS.gap),
    locked: count(STATUS.locked),
    unattempted: count(STATUS.unattempted),
    blocked: blockedByGaps(graph).size,
    ready: readyTopics(graph).length,
  };
}
