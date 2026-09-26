// frontend/src/components/fx/SplitReveal.jsx
//
// Headline reveal: GSAP SplitText breaks the text into masked lines/words and
// the words rise out of their line masks in a tight stagger.
//
// Plays in both scroll directions: rising from below when it enters at the
// bottom of the viewport, dropping in from above when you scroll back up to
// it. Once it has left the viewport it resets so the next entry plays again.
// autoSplit re-splits on resize / font load, so line breaks stay correct
// without having to revert the split after the first play.
//
// The split is created once per mount (no `children` dependency — JSX is a
// new object every render and would tear the split down on every parent
// re-render). If the text genuinely changes, give the component a new `key`.
//
// Only transform + opacity are animated (compositor-only).

import React, { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, prefersReducedMotion } from "../../lib/motion";

export default function SplitReveal({
  as: Tag = "h2",
  children,
  className,
  by = "words", // "words" | "chars" | "lines"
  trigger = "scroll", // "scroll" | "mount"
  delay = 0,
  stagger,
  start = "top 88%",
  // Inside a GSAP-pinned section the heading stays on screen while its
  // natural position scrolls past, so it must not reset when it "leaves".
  pinned = false,
  ...rest
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return undefined;
      if (prefersReducedMotion()) {
        el.classList.remove("split-init");
        return undefined;
      }

      let split;
      let st;
      let shown = false;
      let cancelled = false;
      const run = () => {
        el.classList.remove("split-init");
        let targets = [];
        split = SplitText.create(el, {
          type: by === "chars" ? "lines,words,chars" : by === "lines" ? "lines" : "lines,words",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) => {
            targets = by === "chars" ? self.chars : by === "lines" ? self.lines : self.words;
            // Keep the current visual state across a re-split.
            gsap.set(targets, { yPercent: shown ? 0 : 110, opacity: shown ? 1 : 0, force3D: true });
          },
        });
        const dur = by === "lines" ? 1.1 : 0.95;
        const each = stagger ?? (by === "chars" ? 0.016 : by === "lines" ? 0.1 : 0.04);
        const play = (from, d = 0) => {
          shown = true;
          gsap.fromTo(targets, { yPercent: from, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: "expo.out", stagger: each, delay: d, overwrite: true });
        };
        const reset = (to) => {
          shown = false;
          gsap.set(targets, { yPercent: to, opacity: 0, overwrite: true });
        };

        if (trigger !== "scroll") {
          play(110, delay);
          return;
        }
        st = ScrollTrigger.create({
          trigger: el,
          start,
          end: "bottom 6%",
          onEnter: () => play(110, delay),
          onEnterBack: () => { if (!shown) play(-110); },
          onLeave: () => { if (!pinned) reset(-110); },
          onLeaveBack: () => reset(110),
        });
      };

      // Split after webfonts load, or line breaks are measured on the
      // fallback font and land in the wrong places.
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (!cancelled) run();
      });

      return () => {
        cancelled = true;
        st?.kill();
        split?.revert();
      };
    },
    { scope: ref, dependencies: [] }
  );

  return (
    <Tag ref={ref} className={`split-init ${className || ""}`} {...rest}>
      {children}
    </Tag>
  );
}
