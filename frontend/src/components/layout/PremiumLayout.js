import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';

/**
 * PremiumLayout — The core foundation for the Experiential Design System.
 * Establishes the OLED Absolute Black canvas, fixed ambient volumetric lighting,
 * and the microscopic film grain texture that persists across all scrolling.
 */
export default function PremiumLayout({ children, scene, ambientColors = ["#2563eb", "#7c3aed"] }) {
  const containerRef = useRef(null);
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState(false);

  useEffect(() => {
    // Accessibility & performance: Don't render WebGL on low-end or if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const isMobile = window.innerWidth < 768;

    if (prefersReducedMotion || isLowEnd || isMobile) {
      setShouldRenderCanvas(false);
      return;
    }

    if (!scene) return;

    // Use Intersection Observer to only render WebGL if the container is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRenderCanvas(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [scene]);

  // Microscopic film grain overlay (Base64 SVG for zero network latency)
  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  return (
    <div ref={containerRef} className="relative min-h-screen w-full bg-[#000000] overflow-x-hidden font-sans text-slate-200 selection:bg-indigo-500/30">
      
      {/* 
        1. Volumetric Spotlights 
        Fixed to viewport to prevent scroll gaps/cliffs.
        Animated breathing so the background feels alive with smooth color transition on track switch.
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.14, 0.20, 0.14]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[160px] pointer-events-none mix-blend-screen z-0 transition-colors duration-1000"
        style={{ background: `radial-gradient(circle, ${ambientColors[0]} 0%, transparent 70%)` }}
      />
      
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.12, 0.18, 0.12]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="fixed bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0 transition-colors duration-1000"
        style={{ background: `radial-gradient(circle, ${ambientColors[1]} 0%, transparent 70%)` }}
      />

      {/* 2. Optional 3D Scene Layer via React Three Fiber */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ willChange: 'transform' }}>
        {shouldRenderCanvas && scene ? scene : <StaticGradientFallback colors={ambientColors} />}
      </div>

      {/* 3. Microscopic Film Grain (Soft-light mix blend for physical texture) */}
      <div 
        className="fixed inset-0 z-[5] pointer-events-none opacity-[0.035] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* 4. The Main Content Stream */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {children}
      </div>
    </div>
  );
}

function StaticGradientFallback({ colors }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at 50% 30%, ${colors[0]}15, transparent 70%)`,
      }}
    />
  );
}

/**
 * GlassCard
 * The universal container. Enforces the Vercel-style cursor tracking
 * spotlight and the Apple top-edge bevel highlight. Recalculates rect on hover
 * to maintain 100% accuracy during scrolling.
 */
export function GlassCard({ children, className = "", mousePos }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  const updateRect = () => {
    if (cardRef.current) {
      setRect(cardRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    updateRect();
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  const isHovered = rect && mousePos &&
    mousePos.x >= rect.left && mousePos.x <= rect.right &&
    mousePos.y >= rect.top && mousePos.y <= rect.bottom;

  const cursorX = rect && mousePos ? mousePos.x - rect.left : 0;
  const cursorY = rect && mousePos ? mousePos.y - rect.top : 0;

  return (
    <motion.div 
      ref={cardRef}
      onMouseEnter={updateRect}
      whileHover={{ y: -2 }}
      className={`relative rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 overflow-hidden backdrop-blur-2xl transition-colors duration-300 hover:bg-white/[0.03] ${className}`}
      style={{ 
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 20px 40px -10px rgba(0,0,0,0.5)',
        willChange: 'transform'
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.06), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * AnimatedNumber
 * Tabular slot-machine number roll-up.
 * Now triggers only when scrolled into view.
 */
export function AnimatedNumber({ to, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Number(v.toFixed(decimals)));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { duration: 2, ease: [0.16, 1, 0.3, 1] });
      const unsub = rounded.on("change", setDisplay);
      return () => { controls.stop(); unsub(); };
    }
  }, [isInView, to, count, rounded]);

  return <span ref={ref}>{display}{suffix}</span>;
}