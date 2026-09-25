// frontend/src/components/fx/SplitReveal.jsx
//
// Headline reveal: GSAP SplitText breaks the text into masked lines/words and
// the words rise out of their line masks in a tight stagger.
//
// Runs ONCE per mount. The previous version passed `children` as a hook
// dependency — JSX is a new object on every render, so any parent re-render
// (a typing animation, every keystroke in a form) tore the split down and
// replayed the reveal: thousands of rebuilds per scroll, visible glitching.
// If the text genuinely changes, give the component a new `key`.
//
// Only transform + opacity are animated (compositor-only). No filter blur:
// animating blur on hundreds of word spans was a major source of jank.

import React, { useRef } from "react";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "../../lib/motion";

export default function SplitReveal({
  as: Tag = "h2",
  children,
  className,
  by = "words", // "words" | "chars" | "lines"
  trigger = "scroll", // "scroll" | "mount"
  delay = 0,
  stagger,
  start = "top 85%",
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
      let tween;
      const run = () => {
        el.classList.remove("split-init");
        split = SplitText.create(el, {
          type: by === "chars" ? "lines,words,chars" : by === "lines" ? "lines" : "lines,words",
          mask: "lines",
          linesClass: "split-line",
        });
        const targets = by === "chars" ? split.chars : by === "lines" ? split.lines : split.words;
        tween = gsap.from(targets, {
          yPercent: 110,
          opacity: 0,
          duration: by === "lines" ? 1.1 : 0.95,
          ease: "expo.out",
          stagger: stagger ?? (by === "chars" ? 0.016 : by === "lines" ? 0.1 : 0.04),
          delay,
          force3D: true,
          scrollTrigger: trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
          // Once revealed, drop the wrappers so resizes reflow as normal text.
          onComplete: () => split?.revert(),
        });
      };

      // Split after webfonts load, or line breaks are measured on the
      // fallback font and land in the wrong places.
      let cancelled = false;
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (!cancelled) run();
      });

      return () => {
        cancelled = true;
        tween?.scrollTrigger?.kill();
        tween?.kill();
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
