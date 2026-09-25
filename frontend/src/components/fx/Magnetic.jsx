// frontend/src/components/fx/Magnetic.jsx
//
// Wrap any button or link: it leans toward the cursor while hovered and
// springs back on leave. Mouse/trackpad only; inert on touch and with
// reduced motion.

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { hasFinePointer, prefersReducedMotion, spring } from "../../lib/motion";

export default function Magnetic({ children, strength = 0.28, className = "inline-flex" }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, spring.float);
  const sy = useSpring(y, spring.float);
  const active = hasFinePointer() && !prefersReducedMotion();

  function onMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  if (!active) return <span className={className}>{children}</span>;

  return (
    <motion.span ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} style={{ x: sx, y: sy }} className={className}>
      {children}
    </motion.span>
  );
}
