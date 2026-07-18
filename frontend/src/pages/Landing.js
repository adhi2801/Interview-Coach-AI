import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import PremiumLayout from "../components/layout/PremiumLayout";
import KnowledgeGraphScene from "../components/scenes/KnowledgeGraphScene";
import Button from "../components/ui/Button";
import "./Landing.css";

/**
 * Landing — blueprint section 6, page 1.
 *
 * "Hero uses ghost-type crossfade." One scroll progress value drives:
 *   - the 3D camera dolly (inside KnowledgeGraphScene)
 *   - the ghost-text opacity fading OUT
 *   - the real headline opacity/weight fading IN
 * Same driver, not four independent triggers — per section 4's
 * explicit instruction.
 */
export default function Landing({ onGetStarted, onSignIn }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const ghostOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const realOpacity = useTransform(scrollYProgress, [0.15, 0.5], [0, 1]);
  const realY = useTransform(scrollYProgress, [0.15, 0.5], [20, 0]);

  return (
    <PremiumLayout
      scene={<KnowledgeGraphScene scrollTargetRef={heroRef} />}
      ambientColors={["#2563eb", "#7c3aed"]}
    >
      {/* Floating nav — condenses on scroll per section 5, kept simple here */}
      <nav className="landing-nav">
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
          <motion.h1 className="ds-ghost-text" style={{ opacity: ghostOpacity, top: "38%", left: "8%" }}>
            Know the terrain.
          </motion.h1>

          <motion.div
            className="landing-hero-real"
            style={{ opacity: realOpacity, y: realY }}
          >
            <h1 className="landing-headline">
              Ace your next<br />technical interview.
            </h1>
            <p className="landing-subline">
              Adaptive difficulty, real-time coaching, and company-specific
              prep — built on a real knowledge graph of 93 CS topics.
            </p>
            <div className="landing-hero-actions">
              <Button size="lg" onClick={onGetStarted}>Start free →</Button>
              <Button variant="secondary" size="lg">See how it works</Button>
            </div>
          </motion.div>

          <p className="landing-scroll-hint">Scroll to explore the graph ↓</p>
        </div>
      </section>

      {/* Social proof strip — section 6 / original blueprint item 3 */}
      <section className="landing-proof">
        <p className="landing-proof-label">Trusted by engineers preparing for</p>
        <div className="landing-proof-strip">
          {["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix"].map((c) => (
            <span key={c} className="landing-proof-item">{c}</span>
          ))}
        </div>
      </section>
    </PremiumLayout>
  );
}