// frontend/src/pages/landing/ScrollFilm.jsx
//
// "The loop, on film": a scroll-scrubbed sequence that plays the product's
// core loop as one continuous shot. A few thousand particles morph between
// five shots — your voice, the transcript, the knowledge graph, the five
// score rings, the rating climbing — while chapter captions, a timecode and
// a scrubber make it read like video. Scroll is the playhead: forward plays,
// back rewinds.
//
// Built for phones as much as desktops:
//   - CSS `position: sticky` holds the frame (no JS pinning, no jumps on
//     mobile URL-bar resize); height uses svh
//   - all morphing happens in the vertex shader; JS only updates a few
//     uniforms per frame, and only while the section is on screen
//   - fewer particles and DPR capped on small screens
//   - no WebGL -> the captions still play over a static dot grid

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "../../lib/utils";
import { prefersReducedMotion } from "../../lib/motion";
import { Label, Section } from "./blueprint";
import { FILM_ELO, FILM_SCORES, PALETTE_HEX, buildShots } from "./filmShapes";

export const CHAPTERS = [
  { k: "Voice", title: "You speak.", body: "Answer out loud. Pace, pauses and filler words are tracked while you talk." },
  { k: "Transcript", title: "It hears what you meant.", body: "Every word is transcribed and read for the claim you actually made, not for keywords." },
  { k: "Graph", title: "It maps what you know.", body: "Each claim lands on the 93-topic graph. Gaps glow amber, traced back to the prerequisite you're missing." },
  { k: "Scores", title: "Five scores, with reasons.", body: "Accuracy, problem solving, communication, culture fit and confidence — each graded with written feedback." },
  { k: "Rating", title: "Then it raises the bar.", body: "Your rating moves and the next question is pitched just above where you are now." },
];

// Scroll progress -> shot position (0..4) with holds between the morphs, so
// every shot is readable before the next one starts forming.
const HOLD = 0.58; // fraction of each shot's slice spent holding still
export function shotAt(p) {
  const n = CHAPTERS.length - 1;
  const x = Math.min(0.99999, Math.max(0, p)) * CHAPTERS.length - 0.5; // centre each shot in its slice
  if (x <= 0) return 0;
  if (x >= n) return n;
  const i = Math.floor(x);
  const f = x - i;
  const lo = HOLD / 2;
  const hi = 1 - HOLD / 2;
  return i + (f < lo ? 0 : f > hi ? 1 : (f - lo) / (hi - lo));
}

const VERT = `
precision highp float;
attribute vec2 aP0; attribute vec2 aP1; attribute vec2 aP2; attribute vec2 aP3; attribute vec2 aP4;
attribute vec4 aC; attribute float aC4;
attribute vec4 aSeed;
uniform float uShot;
uniform float uTime;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform float uSize;
uniform vec3 uPal[8];
varying vec3 vCol;
varying float vAlpha;

vec2 P(float k) {
  if (k < 0.5) return aP0;
  if (k < 1.5) return aP1;
  if (k < 2.5) return aP2;
  if (k < 3.5) return aP3;
  return aP4;
}
float C(float k) {
  if (k < 0.5) return aC.x;
  if (k < 1.5) return aC.y;
  if (k < 2.5) return aC.z;
  if (k < 3.5) return aC.w;
  return aC4;
}
vec3 pal(float i) {
  vec3 c = uPal[0];
  for (int j = 1; j < 8; j++) { if (abs(i - float(j)) < 0.5) c = uPal[j]; }
  return c;
}
float ease(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }

void main() {
  float i = min(floor(uShot), 3.0);
  float f = uShot - i;
  // Each particle leaves a little earlier or later than its neighbours.
  float d = aSeed.x * 0.25;
  float t = ease(clamp((f - d) / 0.75, 0.0, 1.0));
  vec2 a = P(i);
  vec2 b = P(i + 1.0);
  vec2 pos = mix(a, b, t);

  // Mid-flight the cloud swirls: a curved detour that vanishes at both ends.
  float fly = sin(t * 3.14159);
  // Rotate the in-between cloud around the frame centre (a vortex, not
  // noise) plus a small per-particle scatter.
  float spin = fly * (0.9 + 0.6 * aSeed.z);
  pos = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * pos * (1.0 - 0.18 * fly);
  float ang = aSeed.y * 6.2831 + uTime * 0.4;
  pos += vec2(cos(ang), sin(ang)) * fly * 0.05;

  // Idle life: the voice bars breathe; everything else drifts a hair.
  float voice = (1.0 - smoothstep(0.0, 0.35, uShot));
  float beat = 0.72 + 0.28 * sin(uTime * (3.0 + aSeed.w * 2.0) + pos.x * 9.0);
  pos.y *= mix(1.0, beat, voice);
  pos += vec2(sin(uTime * 0.7 + aSeed.y * 40.0), cos(uTime * 0.6 + aSeed.x * 40.0)) * 0.004;

  gl_Position = vec4(pos * uScale + uOffset, 0.0, 1.0);
  gl_PointSize = uSize * (0.65 + aSeed.z * 0.9) * (1.0 + 0.6 * fly);

  vec3 ca = pal(C(i));
  vec3 cb = pal(C(i + 1.0));
  vCol = mix(ca, cb, t);
  vAlpha = 0.55 + 0.45 * aSeed.w;
}
`;

const FRAG = `
precision mediump float;
varying vec3 vCol;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float core = smoothstep(0.5, 0.0, r);
  float a = core * core * vAlpha;
  gl_FragColor = vec4(vCol * a, a);
}
`;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Where the shot sits inside the frame, in clip space. Desktop: right of the
// captions. Portrait phones: upper part, captions below.
function layout(width, height) {
  const portrait = width < 768 || height > width * 1.1;
  if (portrait) return { portrait, cx: 0, cy: 0.2, boxW: 0.86, boxH: 0.38 };
  return { portrait, cx: 0.26, cy: 0.02, boxW: 0.6, boxH: 0.62 };
}

function useFilmRenderer(hostRef, shotRef, active) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" });
    const fail = () => {
      canvas.remove();
      setFailed(true);
    };
    if (!gl) { fail(); return undefined; }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { fail(); return undefined; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(); return undefined; }
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // additive: overlapping dots glow

    const onLost = (e) => { e.preventDefault(); fail(); };
    canvas.addEventListener("webglcontextlost", onLost);

    const U = (n) => gl.getUniformLocation(prog, n);
    const uShot = U("uShot");
    const uTime = U("uTime");
    const uScale = U("uScale");
    const uOffset = U("uOffset");
    const uSize = U("uSize");
    gl.uniform3fv(U("uPal"), new Float32Array(PALETTE_HEX.flatMap(hexToRgb)));

    const small = window.innerWidth < 768;
    const N = small ? 2600 : 4200;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
    const buffers = [];
    let count = 0;

    const attr = (name, data, size) => {
      const loc = gl.getAttribLocation(prog, name);
      const b = gl.createBuffer();
      buffers.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };

    // Seeds never change; shapes are rebuilt when the frame's shape changes.
    const seed = new Float32Array(N * 4);
    let s = 7;
    for (let i = 0; i < seed.length; i++) {
      s = (s * 16807) % 2147483647;
      seed[i] = s / 2147483647;
    }
    attr("aSeed", seed, 4);

    let lastKey = "";
    const build = (w, h) => {
      const L = layout(w, h);
      const key = `${L.portrait}`;
      const aspect = w / h;
      // Shapes live in a box of half-size (bw, bh) in "square" units; the
      // scale uniform maps them back to clip space.
      gl.uniform2f(uScale, 1 / aspect, 1);
      gl.uniform2f(uOffset, L.cx, L.cy);
      if (key === lastKey) return;
      lastKey = key;
      buffers.splice(1).forEach((b) => gl.deleteBuffer(b));
      const bw = L.boxW * aspect;
      const bh = L.boxH;
      const shots = buildShots(N, bw, bh, L.portrait);
      shots.forEach((pts, k) => {
        const a = new Float32Array(N * 2);
        pts.forEach((p, i) => { a[i * 2] = p[0]; a[i * 2 + 1] = p[1]; });
        attr(`aP${k}`, a, 2);
      });
      const c = new Float32Array(N * 4);
      const c4 = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        for (let k = 0; k < 4; k++) c[i * 4 + k] = shots[k][i][2];
        c4[i] = shots[4][i][2];
      }
      attr("aC", c, 4);
      attr("aC4", c4, 1);
      count = N;
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uSize, (small ? 3.4 : 3.6) * dpr);
      build(width, height);
    };
    // Shapes rasterise text with the webfont, so wait for it.
    let ro;
    let cancelled = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(host);
    });

    const reduced = prefersReducedMotion();
    const t0 = performance.now();
    let cur = shotRef.current;
    let raf = 0;
    const frame = (now) => {
      // Ease toward the scroll target for a filmic, damped playhead.
      cur += (shotRef.current - cur) * (reduced ? 1 : 0.14);
      gl.uniform1f(uShot, cur);
      gl.uniform1f(uTime, reduced ? 0 : (now - t0) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (count) gl.drawArrays(gl.POINTS, 0, count);
      raf = active.current && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => {
      if (!raf && active.current && !document.hidden) raf = requestAnimationFrame(frame);
    };
    active.kick = kick;
    document.addEventListener("visibilitychange", kick);
    kick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      active.kick = null;
      ro?.disconnect();
      document.removeEventListener("visibilitychange", kick);
      canvas.removeEventListener("webglcontextlost", onLost);
      buffers.forEach((b) => gl.deleteBuffer(b));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [hostRef, shotRef, active]);

  return failed;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function ScrollFilm() {
  const trackRef = useRef(null);
  const hostRef = useRef(null);
  const shotRef = useRef(0);
  const active = useRef(false);
  const [chapter, setChapter] = useState(0);
  const [tc, setTc] = useState("00:00:00");

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const s = shotAt(p);
    shotRef.current = s;
    const ch = Math.min(CHAPTERS.length - 1, Math.round(s));
    setChapter((c) => (c === ch ? c : ch));
    // A 12-second "reel": timecode as mm:ss:ff at 24 fps.
    const frames = Math.round(p * 12 * 24);
    const next = `00:${pad(Math.floor(frames / 24))}:${pad(frames % 24)}`;
    setTc((t) => (t === next ? t : next));
  });

  // Render only while the film is on screen.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => {
      active.current = e.isIntersecting;
      if (e.isIntersecting) active.kick?.();
    }, { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const failed = useFilmRenderer(hostRef, shotRef, active);
  const c = CHAPTERS[chapter];

  return (
    <Section id="film">
      <div ref={trackRef} className="relative h-[460svh] lg:h-[520vh]">
        <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden bg-[#030305]">
          {/* Stage */}
          <div
            ref={hostRef}
            className="absolute inset-0"
            aria-hidden="true"
            style={failed ? { backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.35) 1px, transparent 1.6px)", backgroundSize: "14px 14px" } : undefined}
          />
          {/* Lens: vignette + grain + scanline, all static layers */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,transparent_35%,rgba(3,3,5,0.85)_100%)]" />
          <div aria-hidden="true" className="film-grain pointer-events-none absolute inset-0" />

          {/* Top bar: title + timecode */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/[0.06] px-5 py-3 md:px-8">
            <Label index="00">The loop, on film</Label>
            <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/45">
              <span className="flex items-center gap-1.5 text-rose-300"><span className="rec-dot h-1.5 w-1.5 rounded-full bg-rose-400" />Rec</span>
              <span className="tabular-nums text-white/70">{tc}</span>
              <span className="hidden text-white/30 sm:inline">/ 00:12:00</span>
            </div>
          </div>

          {/* Caption */}
          <div className="absolute inset-x-0 bottom-20 px-5 md:bottom-auto md:left-0 md:right-auto md:top-1/2 md:w-[40%] md:-translate-y-1/2 md:px-10 lg:w-[34%]">
            <motion.div key={chapter} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">
                <span className="text-white/35">{pad(chapter + 1)} / {pad(CHAPTERS.length)} ·</span> {c.k}
              </p>
              <h3 className="mt-3 text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-5xl">{c.title}</h3>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/60">{c.body}</p>
              <ShotData chapter={chapter} />
            </motion.div>
          </div>

          {/* Scrubber */}
          <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.06] px-5 pb-4 pt-3 md:px-8">
            <div className="relative h-[3px] bg-white/[0.08]">
              <motion.div style={{ scaleX: scrollYProgress }} className="absolute inset-0 origin-left bg-linear-to-r from-indigo-500 via-violet-400 to-emerald-300" />
              {CHAPTERS.map((_, i) => (
                <span key={i} className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 bg-white/30" style={{ left: `${((i + 0.5) / CHAPTERS.length) * 100}%` }} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-5 font-mono text-[9.5px] uppercase tracking-[0.14em]">
              {CHAPTERS.map((ch, i) => (
                <span key={ch.k} className={cn("text-center transition-colors duration-500", i === chapter ? "text-white" : "text-white/30")}>{ch.k}</span>
              ))}
            </div>
          </div>
          <p className="sr-only">
            {CHAPTERS.map((ch) => `${ch.title} ${ch.body}`).join(" ")}
          </p>
        </div>
      </div>
    </Section>
  );
}

// A small readout under each caption, tying the shot to real product data.
function ShotData({ chapter }) {
  return (
    <>
      <ShotReadout chapter={chapter} />
      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/30">Example session · illustrative values</p>
    </>
  );
}

function ShotReadout({ chapter }) {
  const base = "mt-5 flex flex-wrap gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em]";
  const chip = "border border-white/10 bg-white/[0.03] px-2 py-1 text-white/60";
  if (chapter === 0) return <div className={base}><span className={chip}>142 wpm</span><span className={chip}>2 fillers</span><span className={cn(chip, "border-rose-400/30 text-rose-200")}>Listening</span></div>;
  if (chapter === 1) return <div className={base}><span className={chip}>63 words</span><span className={cn(chip, "border-violet-400/30 text-violet-200")}>Claim: regional budgets</span></div>;
  if (chapter === 2) return <div className={base}><span className={cn(chip, "border-emerald-400/30 text-emerald-200")}>Solid</span><span className={cn(chip, "border-amber-400/40 text-amber-200")}>Gap · Distributed systems</span></div>;
  if (chapter === 3) {
    const overall = FILM_SCORES.reduce((sum, [, v]) => sum + v, 0) / FILM_SCORES.length;
    return (
      <>
      <div className={cn(base, "md:hidden")}><span className={chip}>Overall {overall.toFixed(1)}</span><span className={chip}>5 dimensions</span></div>
      <ul className="mt-5 hidden max-w-xs space-y-1.5 md:block">
        {FILM_SCORES.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between border-b border-white/[0.06] pb-1 font-mono text-[11px] text-white/55">
            <span>{k}</span><span className="tabular-nums text-white">{v.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      </>
    );
  }
  const last = FILM_ELO[FILM_ELO.length - 1];
  return (
    <div className="mt-5 flex items-end gap-3">
      <span className="text-5xl font-semibold tabular-nums tracking-[-0.04em] text-white">{last}</span>
      <span className="mb-1.5 font-mono text-sm text-emerald-300">+{last - FILM_ELO[FILM_ELO.length - 2]}</span>
    </div>
  );
}
