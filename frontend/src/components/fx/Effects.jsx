// frontend/src/components/fx/Effects.jsx
//
// Signature details used by the best product sites right now:
//   - BorderBeam:      a comet of light travelling around a card's edge
//   - ScrambleText:    labels that decode from glyph noise as they appear
//   - CursorSpotlight: a soft light that follows the pointer across a section
//   - VelocityMarquee: an infinite strip that speeds up, reverses and skews
//                      with the user's scroll velocity
// All are GPU-only (transform / opacity / CSS custom properties) and inert
// under prefers-reduced-motion.

import React, { useEffect, useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "motion/react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { hasFinePointer, prefersReducedMotion } from "../../lib/motion";
import { cn } from "../../lib/utils";

gsap.registerPlugin(ScrambleTextPlugin, ScrollTrigger);

// ---------------------------------------------------------------------------
// BorderBeam — place inside any `relative` rounded container.
// ---------------------------------------------------------------------------
export function BorderBeam({ duration = 7, colorFrom = "#a5b4fc", colorTo = "#6ee7b7", width = 2, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn("border-beam pointer-events-none absolute inset-0 rounded-[inherit]", className)}
      style={{
        "--beam-duration": `${duration}s`,
        "--beam-from": colorFrom,
        "--beam-to": colorTo,
        "--beam-width": `${width}px`,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// ScrambleText — decodes its text when scrolled into view (or on mount).
// ---------------------------------------------------------------------------
export function ScrambleText({ children, as: Tag = "span", className, trigger = "scroll", duration = 1.1, chars = "upperCase", delay = 0 }) {
  const ref = useRef(null);
  const text = typeof children === "string" ? children : String(children ?? "");

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    const tween = gsap.to(el, {
      duration,
      delay,
      ease: "none",
      scrambleText: { text, chars, revealDelay: 0.25, speed: 0.6, tweenLength: false },
      paused: true,
    });
    let st;
    if (trigger === "scroll") {
      // Decodes again whenever it comes back into view, from either direction.
      const replay = () => tween.restart(true);
      st = ScrollTrigger.create({ trigger: el, start: "top 94%", end: "bottom 4%", onEnter: replay, onEnterBack: replay });
    } else {
      tween.play();
    }
    return () => {
      st?.kill();
      tween.kill();
      el.textContent = text;
    };
  }, [text, trigger, duration, chars, delay]);

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// CursorSpotlight — a large radial light that trails the pointer (spring
// eased) inside its parent. Parent must be `relative`.
// ---------------------------------------------------------------------------
export function CursorSpotlight({ size = 680, color = "rgba(99,102,241,0.16)", className }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const sx = useSpring(x, { stiffness: 90, damping: 20, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 90, damping: 20, mass: 0.6 });

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || reduced || !hasFinePointer()) return undefined;
    const onMove = (e) => {
      const rect = parent.getBoundingClientRect();
      x.set(e.clientX - rect.left - size / 2);
      y.set(e.clientY - rect.top - size / 2);
    };
    parent.addEventListener("pointermove", onMove);
    return () => parent.removeEventListener("pointermove", onMove);
  }, [reduced, size, x, y]);

  if (reduced) return <span ref={ref} hidden />;
  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute left-0 top-0 z-0 rounded-full", className)}
      style={{ x: sx, y: sy, width: size, height: size, background: `radial-gradient(circle, ${color}, transparent 62%)` }}
    />
  );
}

// ---------------------------------------------------------------------------
// VelocityMarquee — base drift plus scroll velocity; reverses with scroll
// direction and skews slightly while moving fast.
// ---------------------------------------------------------------------------
export function VelocityMarquee({ children, baseVelocity = -2.2, className }) {
  const reduced = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });
  const skewX = useTransform(smoothVelocity, [-2500, 0, 2500], [8, 0, -8]);
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    const f = velocityFactor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    moveBy += direction.current * moveBy * f;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={cn("overflow-hidden whitespace-nowrap", className)}>
      <motion.div className="flex w-max" style={reduced ? undefined : { x, skewX }}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">{children}</div>
      </motion.div>
    </div>
  );
}
