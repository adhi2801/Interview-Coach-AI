// frontend/src/components/fx/SplitReveal.jsx
//
// Apple-style headline reveal: GSAP SplitText breaks the text into masked
// lines and words; words rise out of their line mask while de-blurring, in a
// tight stagger. SplitText keeps the original text for screen readers
// (aria-label) and re-splits automatically on resize (autoSplit), so line
// breaks stay correct at every width.

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
      if (!el || prefersReducedMotion()) return undefined;

      const split = SplitText.create(el, {
        type: by === "chars" ? "lines,words,chars" : by === "lines" ? "lines" : "lines,words",
        mask: "lines",
        autoSplit: true,
        linesClass: "split-line",
        onSplit(self) {
          const targets = by === "chars" ? self.chars : by === "lines" ? self.lines : self.words;
          return gsap.from(targets, {
            yPercent: 115,
            opacity: 0,
            filter: "blur(10px)",
            rotateX: by === "chars" ? -60 : 0,
            duration: by === "lines" ? 1.25 : 1.05,
            ease: "expo.out",
            stagger: stagger ?? (by === "chars" ? 0.018 : by === "lines" ? 0.12 : 0.045),
            delay,
            scrollTrigger: trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
          });
        },
      });
      return () => split.revert();
    },
    { scope: ref, dependencies: [children] }
  );

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
