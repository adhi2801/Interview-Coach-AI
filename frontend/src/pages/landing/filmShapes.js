// frontend/src/pages/landing/filmShapes.js
//
// Point clouds for the scroll film. Each "shot" is a set of N target points
// (x, y in a unit box, y up) plus a palette index per point. The film's
// particles morph shot-to-shot, so every shot must produce exactly N points.
//
// Shots, in story order:
//   0 voice  — a live voice meter: vertical bars under a speech envelope
//   1 words  — the transcript: a phrase from the answer, rasterised to dots
//   2 graph  — the 93-topic prerequisite graph, gaps in amber
//   3 rings  — five score dimensions as concentric arcs
//   4 climb  — the rating curve rising session over session

import { KNOWLEDGE_CATEGORIES } from "./content";

// Palette indices (the shader holds the colours).
export const PAL = {
  indigo: 0,
  lavender: 1,
  emerald: 2,
  amber: 3,
  dim: 4,
  white: 5,
  violet: 6,
  rose: 7,
};

export const PALETTE_HEX = ["#6366f1", "#c7d2fe", "#34d399", "#fbbf24", "#312e81", "#ffffff", "#a78bfa", "#fb7185"];

// Deterministic PRNG so shapes don't reshuffle on every resize.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fit a list of samples to exactly n points by cycling / subsampling.
function fit(points, n, rand) {
  const out = new Array(n);
  if (!points.length) {
    for (let i = 0; i < n; i++) out[i] = [0, 0, PAL.dim];
    return out;
  }
  // Shuffle a copy so subsampling is uniform.
  const src = points.slice();
  for (let i = src.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [src[i], src[j]] = [src[j], src[i]];
  }
  for (let i = 0; i < n; i++) {
    const p = src[i % src.length];
    // Repeats get a hair of jitter so they don't stack on one pixel.
    const j = i >= src.length ? 0.006 : 0;
    out[i] = [p[0] + (rand() - 0.5) * j, p[1] + (rand() - 0.5) * j, p[2]];
  }
  return out;
}

// --- 0: voice meter -------------------------------------------------------
function voice(n, w, h, rand) {
  const bars = w > h ? 56 : 32;
  const pts = [];
  for (let b = 0; b < bars; b++) {
    const t = b / (bars - 1);
    const x = (t * 2 - 1) * w;
    // Envelope of a spoken phrase: a few syllable bumps under a soft hull.
    const env = 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.55 + 0.45 * Math.abs(Math.sin(t * 17.3 + 1.2)));
    const bh = env * h * 0.62;
    const per = Math.round(n / bars) + 4;
    for (let k = 0; k < per; k++) {
      const y = (rand() * 2 - 1) * bh;
      const edge = Math.abs(y) > bh * 0.8;
      pts.push([x + (rand() - 0.5) * (w / bars) * 0.35, y, edge ? PAL.lavender : PAL.indigo]);
    }
  }
  return fit(pts, n, rand);
}

// --- 1: words -------------------------------------------------------------
function words(n, w, h, rand, portrait) {
  const lines = portrait ? ["token bucket", "per region"] : ["“a token bucket", "per region”"];
  const cw = 1200;
  const ch = 520;
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 190;
  ctx.font = `700 ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  size = Math.floor(size * Math.min(1, (cw * 0.94) / widest));
  ctx.font = `700 ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.08));
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const pts = [];
  const step = 4;
  const accentLine = lines.length - 1;
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if (data[(y * cw + x) * 4 + 3] > 140) {
        const nx = (x / cw) * 2 - 1;
        const ny = -((y / ch) * 2 - 1) * (ch / cw);
        const onAccent = y > ch / 2 + (accentLine - (lines.length - 1) / 2) * size * 1.08 - size * 0.5;
        pts.push([nx * w, ny * w, onAccent ? PAL.violet : PAL.white]);
      }
    }
  }
  return fit(pts, n, rand);
}

// --- 2: knowledge graph ---------------------------------------------------
function statusColor(s) {
  if (s === "passed") return PAL.emerald;
  if (s === "gap") return PAL.amber;
  return PAL.dim;
}

function graph(n, w, h, rand) {
  const cats = KNOWLEDGE_CATEGORIES;
  const nodes = [];
  const edges = [];
  cats.forEach((cat, ci) => {
    const a = (ci / cats.length) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(a) * w * 0.62;
    const cy = Math.sin(a) * h * 0.58;
    const first = nodes.length;
    cat.nodes.forEach((node, i) => {
      // Golden-angle spiral inside the cluster.
      const r = Math.sqrt((i + 0.6) / cat.nodes.length) * Math.min(w, h) * 0.3;
      const t = i * 2.39996;
      nodes.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r, c: statusColor(node.status), gap: node.status === "gap" });
      if (i > 0) edges.push([first + Math.floor(i / 2), first + i]);
    });
    // Hub-to-hub links: domains depend on each other.
    const nextFirst = first + cat.nodes.length;
    if (ci > 0) edges.push([first, first - cats[ci - 1].nodes.length]);
    if (ci === cats.length - 1) edges.push([first, 0]);
    if (ci % 2 === 0 && ci + 2 < cats.length) edges.push([first + 1, nextFirst + cats[ci + 1].nodes.length + 1]);
  });
  const pts = [];
  // Node blobs (gaps bigger), then edges as sparse dotted lines.
  const nodeShare = Math.floor(n * 0.5);
  const weights = nodes.map((nd) => (nd.gap ? 2.6 : 1));
  const wsum = weights.reduce((s, x) => s + x, 0);
  nodes.forEach((nd, i) => {
    const k = Math.max(3, Math.round((nodeShare * weights[i]) / wsum));
    const rad = (nd.gap ? 0.028 : 0.017) * Math.min(w, h) * 1.6;
    for (let j = 0; j < k; j++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * rad;
      pts.push([nd.x + Math.cos(a) * r, nd.y + Math.sin(a) * r, nd.c]);
    }
  });
  const valid = edges.filter(([a, b]) => nodes[a] && nodes[b]);
  const lens = valid.map(([a, b]) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y));
  const lsum = lens.reduce((s, x) => s + x, 0) || 1;
  const edgeShare = n - pts.length;
  valid.forEach(([a, b], i) => {
    const k = Math.max(2, Math.round((edgeShare * lens[i]) / lsum));
    const A = nodes[a];
    const B = nodes[b];
    const c = A.gap || B.gap ? PAL.amber : PAL.indigo;
    for (let j = 0; j < k; j++) {
      const t = rand();
      pts.push([A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, c === PAL.amber && rand() < 0.5 ? PAL.dim : c]);
    }
  });
  return fit(pts, n, rand);
}

// --- 3: score rings -------------------------------------------------------
export const FILM_SCORES = [
  ["Technical accuracy", 8.2],
  ["Problem solving", 7.6],
  ["Communication", 6.9],
  ["Culture fit", 7.8],
  ["Confidence", 6.4],
];
const RING_COLORS = [PAL.lavender, PAL.violet, PAL.indigo, PAL.emerald, PAL.rose];

function rings(n, w, h, rand) {
  const R = Math.min(w, h) * 0.98;
  const radii = FILM_SCORES.map((_, i) => R * (1 - i * 0.16));
  const arcs = FILM_SCORES.map(([, v], i) => ({ r: radii[i], sweep: (v / 10) * Math.PI * 2, c: RING_COLORS[i] }));
  const total = arcs.reduce((s, a) => s + a.r * a.sweep, 0);
  const trackShare = Math.floor(n * 0.14);
  const pts = [];
  arcs.forEach((a) => {
    const k = Math.round(((n - trackShare) * a.r * a.sweep) / total);
    for (let j = 0; j < k; j++) {
      const t = (j / k) * a.sweep;
      const ang = Math.PI / 2 - t; // clockwise from 12 o'clock
      const rr = a.r + (rand() - 0.5) * R * 0.05;
      pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr, a.c]);
    }
  });
  // Faint remainder of each track.
  for (let j = 0; j < trackShare; j++) {
    const a = arcs[j % arcs.length];
    const t = a.sweep + rand() * (Math.PI * 2 - a.sweep);
    const ang = Math.PI / 2 - t;
    pts.push([Math.cos(ang) * a.r, Math.sin(ang) * a.r, PAL.dim]);
  }
  return fit(pts, n, rand);
}

// --- 4: rating climb ------------------------------------------------------
export const FILM_ELO = [1188, 1204, 1197, 1231, 1226, 1259, 1284, 1301];

function climb(n, w, h, rand) {
  const lo = Math.min(...FILM_ELO) - 20;
  const hi = Math.max(...FILM_ELO) + 10;
  const P = FILM_ELO.map((v, i) => [(i / (FILM_ELO.length - 1) * 2 - 1) * w, ((v - lo) / (hi - lo) * 2 - 1) * h * 0.8]);
  const pts = [];
  const lineShare = Math.floor(n * 0.42);
  const segLens = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]));
  const L = segLens.reduce((s, x) => s + x, 0);
  segLens.forEach((len, i) => {
    const k = Math.round((lineShare * len) / L);
    for (let j = 0; j < k; j++) {
      const t = j / k;
      pts.push([P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t + (rand() - 0.5) * 0.01, i === segLens.length - 1 ? PAL.emerald : PAL.lavender]);
    }
  });
  // Session markers; the latest one big and bright.
  P.forEach((p, i) => {
    const last = i === P.length - 1;
    const k = last ? 160 : 40;
    const rad = (last ? 0.07 : 0.03) * Math.min(w, h);
    for (let j = 0; j < k; j++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * rad;
      pts.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, last ? PAL.white : PAL.violet]);
    }
  });
  // Soft fill under the curve.
  const floor = -h * 0.95;
  while (pts.length < n) {
    const x = (rand() * 2 - 1) * w;
    const f = ((x / w + 1) / 2) * (P.length - 1);
    const i = Math.min(P.length - 2, Math.floor(f));
    const yTop = P[i][1] + (P[i + 1][1] - P[i][1]) * (f - i);
    const y = floor + Math.pow(rand(), 1.8) * (yTop - floor);
    pts.push([x, y, PAL.dim]);
  }
  return fit(pts, n, rand);
}

// Build every shot for a box of half-size (w, h) in GL units.
export function buildShots(n, w, h, portrait) {
  const rand = rng(1301);
  return [voice(n, w, h, rand), words(n, w, h, rand, portrait), graph(n, w, h, rand), rings(n, w, h, rand), climb(n, w, h, rand)];
}
