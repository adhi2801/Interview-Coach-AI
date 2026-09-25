// frontend/src/components/fx/ScrollFillText.jsx
//
// A paragraph whose words light up one after another, locked to scroll
// position (and dim again when scrolling back up). Words are split once by
// hand into spans; only their opacity animates, scrubbed by ScrollTrigger.

import React, { useMemo, useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "../../lib/motion";

export default function ScrollFillText({ text, className, as: Tag = "p", dim = 0.16, accentWords = [] }) {
  const ref = useRef(null);
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const accents = useMemo(() => new Set(accentWords.map((w) => w.toLowerCase())), [accentWords]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const spans = el.querySelectorAll("[data-w]");
      gsap.set(spans, { opacity: dim });
      gsap.to(spans, {
        opacity: 1,
        ease: "none",
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
      });
    },
    { scope: ref, dependencies: [text] }
  );

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span
          key={i}
          data-w=""
          aria-hidden="true"
          className={accents.has(w.replace(/[.,!?]/g, "").toLowerCase()) ? "text-indigo-300" : undefined}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
