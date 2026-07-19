import { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useMotionValueEvent } from "framer-motion";
import PremiumLayout from "../components/layout/PremiumLayout";
import KnowledgeGraphScene from "../components/scenes/KnowledgeGraphScene";
import Button from "../components/ui/Button";
import "./Landing.css";

/**
 * Landing — blueprint section 6, page 1.
 *
 * Upgraded to "Cinematic Fly-Through" Blueprint:
 * 1. Sequential 3D scrolling (Ghost out -> Graph zooms in -> Real text fades in)
 * 2. Morphing Header Pill (Dynamic scroll threshold)
 * 3. Radial Vignette Masking (Prevents text/node collision)
 * 4. Infinite Sliding Marquee (Social proof)
 */
export default function Landing({ onGetStarted, onSignIn }) {
  const heroRef = useRef(null);
  
  const { scrollY, scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Track absolute scroll for the Morphing Header Pill
  const [isScrolled, setIsScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 80);
  });

  // Fold 1 (0% - 30%): Ghost text dissolves
  const ghostOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const ghostScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.05]);

  // The Descent (0% - 60%): Background graph flies forward and unblurs
  const graphScale = useTransform(scrollYProgress, [0, 0.6], [0.85, 1.1]);
  const graphBlur = useTransform(scrollYProgress, [0, 0.6], ["blur(12px)", "blur(0px)"]);
  const graphOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6], [0.4, 0.8, 1]);

  // Fold 2 (60% - 85%): Main CTA fades in perfectly clear
  const realOpacity = useTransform(scrollYProgress, [0.6, 0.85], [0, 1]);
  const realY = useTransform(scrollYProgress, [0.6, 0.85], [40, 0]);
  const realScale = useTransform(scrollYProgress, [0.6, 0.85], [0.95, 1]);

  const logos = ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix"];
  const marqueeLogos = [...logos, ...logos, ...logos]; // Triple for seamless loop

  return (
    <PremiumLayout
      // We wrap the scene to inject the scroll-linked Z-axis fly-through
      scene={
        <motion.div 
          className="w-full h-full absolute inset-0"
          style={{ scale: graphScale, filter: `blur(${graphBlur.get()})`, opacity: graphOpacity }}
        >
          <KnowledgeGraphScene scrollTargetRef={heroRef} />
        </motion.div>
      }
      ambientColors={["#2563eb", "#7c3aed"]}
    >
      
      {/* Blueprint Feature 4: Radial Vignette Masking */}
      {/* Forces nodes behind text to stay dim, while outer nodes remain bright */}
      <div className="landing-vignette pointer-events-none" />

      {/* Blueprint Feature 2: Morphing Header Pill */}
      <nav className={`landing-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-brand-mark">AI</div>
            <span>InterviewCoach</span>
          </div>
          <div className="landing-nav-actions">
            <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
            <Button size="sm" onClick={onGetStarted}>Get started</Button>
          </div>
        </div>
      </nav>

      {/* Hero — 200vh so there's real scroll distance for the dolly/crossfade to play out */}
      <section ref={heroRef} style={{ height: "200vh", position: "relative" }}>
        <div className="landing-hero-sticky">
          
          <motion.h1 
            className="ds-ghost-text absolute w-full text-center" 
            style={{ opacity: ghostOpacity, scale: ghostScale, top: "40%" }}
          >
            Know the terrain.
          </motion.h1>

          <motion.div
            className="landing-hero-real"
            style={{ opacity: realOpacity, y: realY, scale: realScale }}
          >
            <h1 className="landing-headline">
              Ace your next<br />technical interview.
            </h1>
            <p className="landing-subline">
              Adaptive difficulty, real-time coaching, and company-specific
              prep — built on a real knowledge graph of 93 CS topics.
            </p>
            <div className="landing-hero-actions">
              {/* High-contrast tactile CTA */}
              <Button size="lg" onClick={onGetStarted} className="tactile-cta">
                Start free →
                <kbd className="cta-shortcut">↵</kbd>
              </Button>
              <Button variant="secondary" size="lg" className="secondary-cta">
                See how it works
              </Button>
            </div>
          </motion.div>

          <motion.p 
            className="landing-scroll-hint"
            style={{ opacity: ghostOpacity }} // Fades out as you scroll down
          >
            Scroll to explore the graph ↓
          </motion.p>
        </div>
      </section>

      {/* Blueprint Feature 5: Infinite Sliding Logo Marquee */}
      <section className="landing-proof">
        <p className="landing-proof-label">Trusted by engineers preparing for</p>
        <div className="landing-proof-marquee-wrapper">
          <div className="landing-proof-strip">
            {marqueeLogos.map((c, idx) => (
              <span key={`${c}-${idx}`} className="landing-proof-item">{c}</span>
            ))}
          </div>
        </div>
      </section>
    </PremiumLayout>
  );
}