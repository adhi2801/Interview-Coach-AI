import { Suspense, useState, useEffect, useRef } from "react";

/**
 * PremiumLayout — Shared four-layer dark mode architecture.
 *   z-0  Canvas    — R3F 3D scene (optional)
 *   z-5  Ambient   — Viewport-spanning radial gradient spotlights
 *   z-10 Noise     — Soft film grain overlay
 *   z-20 UI        — Main page content
 */
export default function PremiumLayout({ scene, ambientColors = ["#2563eb", "#7c3aed"], children }) {
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const isMobile = window.innerWidth < 768;

    if (prefersReducedMotion || isLowEnd || isMobile) {
      setShouldRenderCanvas(false);
      return;
    }

    if (!scene) return;

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

  return (
    <div 
      ref={containerRef} 
      style={{ position: "relative", minHeight: "100vh", backgroundColor: "#000000", overflowX: "hidden" }}
    >
      {/* z-0: Canvas layer */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {shouldRenderCanvas && scene ? (
          <Suspense fallback={<StaticGradientFallback colors={ambientColors} />}>
            {scene}
          </Suspense>
        ) : (
          <StaticGradientFallback colors={ambientColors} />
        )}
      </div>

      {/* z-5: Extended Ambient Spotlights (Fixed & Viewport-spanning to prevent lighting cliffs) */}
      <div style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            width: "70vw",
            height: "70vw",
            maxWidth: "900px",
            maxHeight: "900px",
            borderRadius: "50%",
            filter: "blur(140px)",
            opacity: 0.22,
            background: `radial-gradient(circle, ${ambientColors[0] || "#2563eb"} 0%, transparent 70%)`,
            top: "-15%",
            left: "15%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "60vw",
            height: "60vw",
            maxWidth: "800px",
            maxHeight: "800px",
            borderRadius: "50%",
            filter: "blur(140px)",
            opacity: 0.18,
            background: `radial-gradient(circle, ${ambientColors[1] || "#7c3aed"} 0%, transparent 70%)`,
            top: "40%",
            right: "-10%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "65vw",
            height: "65vw",
            maxWidth: "850px",
            maxHeight: "850px",
            borderRadius: "50%",
            filter: "blur(150px)",
            opacity: 0.15,
            background: `radial-gradient(circle, ${ambientColors[0] || "#2563eb"} 0%, transparent 70%)`,
            bottom: "-10%",
            left: "-10%",
          }}
        />
      </div>

      {/* z-10: Film grain texture */}
      <div 
        style={{ 
          zIndex: 10, 
          position: "fixed", 
          inset: 0, 
          pointerEvents: "none", 
          opacity: 0.03, 
          mixBlendMode: "soft-light",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} 
      />

      {/* z-20: Main UI Content */}
      <div style={{ position: "relative", zIndex: 20 }}>{children}</div>
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