import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * CursorSpotlight — section 3's exact spec:
 *   "260px radial glow, 0 opacity at rest, ramps to 0.12 opacity over 200ms,
 *    and lags the cursor by ~80ms via spring rather than tracking 1:1 —
 *    a glow glued exactly to the cursor reads as fake; a slight drag
 *    reads as physical."
 *
 * Wrap this around any .ds-glass panel that should feel physically
 * reactive to the cursor. Do not apply to more than one card type
 * per viewport, per the "restraint is the premium signal" rule.
 */
export default function CursorSpotlight({ children }) {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const opacity = useMotionValue(0);

  // ~80ms lag via spring stiffness/damping tuned to that delay, not 1:1 tracking
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30, mass: 0.5 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
      opacity.set(0.12);
    }
    function handleLeave() {
      opacity.set(0);
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [mouseX, mouseY, opacity]);

  return (
    <div ref={containerRef} style={{ position: "relative", overflow: "hidden" }}>
      <motion.div
        style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)",
          pointerEvents: "none",
          left: springX,
          top: springY,
          x: "-50%",
          y: "-50%",
          opacity,
          transition: "opacity 0.2s ease",
        }}
      />
      {children}
    </div>
  );
}