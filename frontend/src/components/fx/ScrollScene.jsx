// frontend/src/components/fx/ScrollScene.jsx
//
// Apple product-page entrance: the showcase starts tilted back in 3D, small
// and dim, and as you scroll it swings upright, scales to full size and
// lights up — scroll position is the playhead. Built on Motion's useScroll,
// which runs on the browser's native ScrollTimeline where available.

import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "motion/react";

export function TiltScene({ children, className, maxTilt = 28, from = 0.86 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const rotateX = useTransform(p, [0, 1], [maxTilt, 0]);
  const scale = useTransform(p, [0, 1], [from, 1]);
  const y = useTransform(p, [0, 1], [80, 0]);
  const brightness = useTransform(p, [0, 1], [0.55, 1]);
  const filter = useTransform(brightness, (b) => `brightness(${b})`);

  return (
    <div ref={ref} className={className} style={{ perspective: 1400 }}>
      <motion.div
        style={reduced ? undefined : { rotateX, scale, y, filter, transformOrigin: "50% 100%" }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Scroll progress bar pinned to the top of the viewport.
export function ScrollProgress({ className }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden="true" style={{ scaleX }} className={className} />;
}

// Parallax: moves its children at a different rate than the scroll.
export function Parallax({ children, speed = 0.2, className }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}px`, `${-speed * 100}px`]);
  return (
    <motion.div ref={ref} style={reduced ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}
