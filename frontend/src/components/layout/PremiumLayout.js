import { Suspense, useState, useEffect, useRef } from "react";

/**
 * PremiumLayout — the shared four-layer architecture every page uses.
 *
 *   z-0  Canvas    — R3F 3D scene, unique per page, passed in as `scene`
 *   z-5  Ambient    — 2-3 blurred radial gradient blobs, color-tuned per page
 *   z-10 Noise      — drifting grain, mix-blend soft-light, never static
 *   z-20 UI         — the real content, passed in as children
 *
 * Per section 8 (Performance & Accessibility Contract):
 *   - Canvas lazy-mounts via IntersectionObserver, static gradient shows first
 *   - prefers-reduced-motion freezes camera drift / noise drift entirely
 *   - Mobile/low-end: Canvas is dropped, static gradient + noise only
 *
 * Usage:
 *   <PremiumLayout scene={<KnowledgeGraphScene />} ambientColors={["#2563eb", "#7c3aed"]}>
 *     <YourPageContent />
 *   </PremiumLayout>
 */
export default function PremiumLayout({ scene, ambientColors = ["#2563eb"], children }) {
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const isMobile = window.innerWidth < 768;

    // Section 8: mobile/low-end drops the live Canvas entirely, static gradient + noise only
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
    <div ref={containerRef} style={{ position: "relative", minHeight: "100vh", backgroundColor: "var(--bg-void)" }}>
      {/* z-0: Canvas layer */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        {shouldRenderCanvas && scene ? (
          <Suspense fallback={<StaticGradientFallback colors={ambientColors} />}>
            {scene}
          </Suspense>
        ) : (
          <StaticGradientFallback colors={ambientColors} />
        )}
      </div>

      {/* z-5: Ambient light layer — kept separate from Canvas so it can be
          retuned without touching WebGL code, per section 2.
          BOOSTED: larger blobs, higher opacity, positioned to sit behind
          the content column instead of near the page edges — the previous
          values were so faint and so far from where cards actually sit
          that they contributed almost no visible light to the page. */}
      <div style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}>
        {ambientColors.slice(0, 3).map((color, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "1000px",
              height: "800px",
              borderRadius: "50%",
              filter: "blur(120px)",
              opacity: 0.28,
              background: `radial-gradient(ellipse, ${color}, transparent 70%)`,
              top: `${-100 + i * 260}px`,
              left: i % 2 === 0 ? "10%" : "45%",
            }}
          />
        ))}
      </div>

      {/* z-10: Noise grain — must drift, never static (section 2 + 5) */}
      <div className="ds-noise-grain" style={{ zIndex: 10 }} />

      {/* z-20: Real UI content */}
      <div style={{ position: "relative", zIndex: 20 }}>{children}</div>
    </div>
  );
}

/**
 * Static gradient fallback — shown while the Canvas is lazy-loading, and
 * permanently on mobile/low-end/reduced-motion. SSR-safe, no WebGL dependency.
 */
function StaticGradientFallback({ colors }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at 30% 20%, ${colors[0]}15, transparent 60%)`,
      }}
    />
  );
}