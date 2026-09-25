// frontend/src/components/fx/LiquidGlass.jsx
//
// The glass rule for the whole product. One material, three layers:
//
//   1. Body   — tinted, frosted backdrop (blur + saturation) so content stays
//               legible over anything.
//   2. Light  — a rim highlight and an inner sheen that follow the pointer,
//               driven by CSS variables (no React re-render per mouse move;
//               the old per-page cards re-rendered on every pixel of motion).
//   3. Lens   — optional true refraction (`refract`): an SVG displacement map
//               generated for the element's exact size and corner radius bends
//               the backdrop at the edges like Apple's Liquid Glass, with a
//               touch of chromatic aberration. Chromium only (the only engine
//               that accepts SVG filters in backdrop-filter); everywhere else
//               the surface gracefully stays frosted glass.
//
// Tilt, press and hover lift are springs from Motion.

import React, { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { hasFinePointer, prefersReducedMotion, spring } from "../../lib/motion";
import { cn } from "../../lib/utils";
import { BorderBeam } from "./Effects";

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

let refractSupport = null;
function supportsRefraction() {
  if (refractSupport !== null) return refractSupport;
  if (typeof navigator === "undefined") return (refractSupport = false);
  const brands = navigator.userAgentData?.brands?.map((b) => b.brand).join(" ") || "";
  const ua = navigator.userAgent || "";
  const chromium = /Chromium|Google Chrome|Microsoft Edge|Brave|Opera/.test(brands) || (/Chrome\//.test(ua) && !/Firefox|FxiOS/.test(ua));
  refractSupport = chromium && !prefersReducedMotion();
  return refractSupport;
}

// ---------------------------------------------------------------------------
// Displacement map: a signed-distance field of a rounded rectangle. Inside the
// bezel band, each pixel encodes (in R/G) a vector pointing back toward the
// surface interior, strongest at the very edge — the way a thick curved glass
// edge magnifies and bends what's behind it.
// ---------------------------------------------------------------------------

const mapCache = new Map();

function buildDisplacementMap(w, h, radius, bezel) {
  const key = `${w}x${h}r${radius}b${bezel}`;
  if (mapCache.has(key)) return mapCache.get(key);

  const scale = Math.min(1, 256 / Math.max(w, h)); // cap cost; feImage stretches it back
  const cw = Math.max(8, Math.round(w * scale));
  const ch = Math.max(8, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(cw, ch);
  const r = Math.min(radius, w / 2, h / 2);
  const hw = w / 2;
  const hh = h / 2;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = ((x + 0.5) / cw) * w - hw;
      const py = ((y + 0.5) / ch) * h - hh;
      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const depth = -(outside + inside - r); // distance inward from the edge

      let dx = 0;
      let dy = 0;
      if (depth > 0 && depth < bezel) {
        let nx;
        let ny;
        if (qx > 0 && qy > 0) {
          const len = Math.hypot(qx, qy) || 1;
          nx = qx / len;
          ny = qy / len;
        } else if (qx > qy) {
          nx = 1;
          ny = 0;
        } else {
          nx = 0;
          ny = 1;
        }
        nx *= Math.sign(px) || 1;
        ny *= Math.sign(py) || 1;
        const t = 1 - depth / bezel;
        const mag = t * t * (3 - 2 * t); // smoothstep falloff into the flat centre
        dx = -nx * mag;
        dy = -ny * mag;
      }
      const i = (y * cw + x) * 4;
      img.data[i] = Math.round(128 + dx * 127);
      img.data[i + 1] = Math.round(128 + dy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/png");
  if (mapCache.size > 64) mapCache.clear();
  mapCache.set(key, url);
  return url;
}

function RefractionFilter({ id, width, height, radius, bezel, strength, aberration }) {
  const href = useMemo(() => buildDisplacementMap(width, height, radius, bezel), [width, height, radius, bezel]);
  const channel = (scale, matrix, result) => (
    <>
      <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result={`${result}d`} />
      <feColorMatrix in={`${result}d`} type="matrix" values={matrix} result={result} />
    </>
  );
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width={width}
          height={height}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={href} x="0" y="0" width={width} height={height} preserveAspectRatio="none" result="map" />
          {channel(strength, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", "r")}
          {channel(strength * (1 + aberration), "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", "g")}
          {channel(strength * (1 + aberration * 2), "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", "b")}
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pointer light: writes --mx / --my / --lit on the element (rAF-throttled).
// ---------------------------------------------------------------------------

function usePointerLight(ref, { tilt, rx, ry }) {
  const frame = useRef(0);
  const onMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      cancelAnimationFrame(frame.current);
      const { clientX, clientY } = e;
      frame.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        el.style.setProperty("--lit", "1");
        if (tilt) {
          ry.set((x / rect.width - 0.5) * 8);
          rx.set((y / rect.height - 0.5) * -8);
        }
      });
    },
    [ref, tilt, rx, ry]
  );
  const onLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (el) el.style.setProperty("--lit", "0");
    if (tilt) {
      rx.set(0);
      ry.set(0);
    }
  }, [ref, tilt, rx, ry]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { onMove, onLeave };
}

function useElementSize(ref, enabled) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const el = ref.current;
    let raf = 0;
    // The filter must match the element's border box (offsetWidth/Height),
    // not its content box, or the refraction band lands inside the padding.
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (!w || !h) return;
        setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ref, enabled]);
  return size;
}

// ---------------------------------------------------------------------------
// LiquidGlass — the base surface.
// ---------------------------------------------------------------------------

const TONES = {
  // Default: deep, near-black tint — reads as dark glass over the aurora.
  dark: "lg-tone-dark",
  // Lighter, more transparent — for floating chrome (nav, pills, toolbars).
  clear: "lg-tone-clear",
  // Accent-tinted states.
  indigo: "lg-tone-indigo",
  emerald: "lg-tone-emerald",
  amber: "lg-tone-amber",
};

export const LiquidGlass = forwardRef(function LiquidGlass(
  {
    as = "div",
    children,
    className,
    style,
    tone = "dark",
    radius = 20,
    frost = 22,
    // Live backdrop blur. OFF by default: sampling a moving background behind
    // dozens of cards was the main cause of scroll jank. Reserve it for one or
    // two floating surfaces (the nav, dialogs).
    backdrop = false,
    refract = false,
    refractStrength = 38,
    lensBlur,
    beam = false,
    bezel = 22,
    tilt = false,
    interactive = false,
    lift = interactive,
    active = false,
    layout = false,
    onClick,
    contentClassName = "relative z-10 h-full",
    ...rest
  },
  forwardedRef
) {
  const innerRef = useRef(null);
  const setRefs = useCallback(
    (node) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const fine = hasFinePointer();
  const reduced = prefersReducedMotion();
  const canTilt = tilt && fine && !reduced;
  const lens = backdrop && refract && supportsRefraction();

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, spring.tilt);
  const sry = useSpring(ry, spring.tilt);

  const { onMove, onLeave } = usePointerLight(innerRef, { tilt: canTilt, rx, ry });
  const size = useElementSize(innerRef, lens);
  const rawId = useId();
  const filterId = `lg-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const backdropFilter = !backdrop
    ? undefined
    : lens && size
      ? `url(#${filterId}) blur(${lensBlur ?? Math.max(2, frost * 0.3)}px) saturate(185%) brightness(1.06)`
      : `blur(${frost}px) saturate(170%)`;

  const Component = motion[as] || motion.div;

  return (
    <Component
      ref={setRefs}
      layout={layout}
      onClick={onClick}
      onPointerMove={fine ? onMove : undefined}
      onPointerLeave={fine ? onLeave : undefined}
      whileHover={lift && !reduced ? { y: -3 } : undefined}
      whileTap={interactive && !reduced ? { scale: 0.985 } : undefined}
      transition={spring.soft}
      className={cn(
        "lg",
        backdrop && "lg-backdrop",
        TONES[tone] || TONES.dark,
        active && "lg-active",
        interactive && "cursor-pointer",
        className
      )}
      style={{
        "--lg-radius": `${radius}px`,
        borderRadius: radius,
        backdropFilter,
        WebkitBackdropFilter: backdrop ? `blur(${frost}px) saturate(170%)` : undefined,
        ...(canTilt ? { rotateX: srx, rotateY: sry, transformPerspective: 1000 } : null),
        ...style,
      }}
      {...rest}
    >
      {lens && size && (
        <RefractionFilter
          id={filterId}
          width={size.w}
          height={size.h}
          radius={radius}
          bezel={Math.min(bezel, size.w / 3, size.h / 3)}
          strength={refractStrength}
          aberration={0.06}
        />
      )}
      <span aria-hidden="true" className="lg-sheen" />
      {beam && <BorderBeam {...(typeof beam === "object" ? beam : {})} />}
      <div className={contentClassName}>{children}</div>
    </Component>
  );
});

// ---------------------------------------------------------------------------
// GlassCard — drop-in replacement for the per-page cards (same props they used,
// plus `tone`, `refract`, `glow`).
// ---------------------------------------------------------------------------

export function GlassCard({
  children,
  className = "",
  interactive = false,
  tilt = false,
  onClick,
  active = false,
  layout = false,
  tone,
  refract = false,
  radius = 18,
  ...rest
}) {
  return (
    <LiquidGlass
      className={cn("overflow-hidden", className)}
      interactive={interactive}
      tilt={tilt}
      onClick={onClick}
      active={active}
      layout={layout}
      tone={tone || (active ? "indigo" : "dark")}
      refract={refract}
      radius={radius}
      {...rest}
    >
      {children}
    </LiquidGlass>
  );
}

export default LiquidGlass;
