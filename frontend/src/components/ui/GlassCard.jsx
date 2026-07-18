import { useState, useRef } from "react";

/**
 * GlassCard — the one place the "deep glass" recipe lives.
 * Every page should import this instead of retyping the class string.
 *
 * Recipe: bg-white/[0.02] + border-white/[0.05] + backdrop-blur-xl for
 * physical depth, an inset white-line shadow for the "beveled edge"
 * highlight, and an optional Vercel-style cursor spotlight that only
 * activates while the mouse is actually over this specific card.
 *
 * Usage:
 *   <GlassCard>...</GlassCard>                  — static, no spotlight
 *   <GlassCard spotlight>...</GlassCard>         — cursor-reactive
 *   <GlassCard className="p-10">...</GlassCard>  — override padding/etc
 */
export default function GlassCard({ children, spotlight = false, className = "" }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  function handleMouseMove(e) {
    if (!spotlight || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => spotlight && setHovered(true)}
      onMouseLeave={() => spotlight && setHovered(false)}
      onMouseMove={handleMouseMove}
      className={`relative rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl overflow-hidden ${className}`}
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 20px 40px -10px rgba(0,0,0,0.5)" }}
    >
      {spotlight && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.04), transparent 40%)`,
            opacity: hovered ? 1 : 0,
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}