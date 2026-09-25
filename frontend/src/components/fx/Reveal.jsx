// frontend/src/components/fx/Reveal.jsx
//
// Staggered scroll reveal for groups. Every descendant marked [data-reveal]
// rises in with a de-blur, batched by ScrollTrigger so items that enter the
// viewport together animate together in a cascade — one animation system
// for every grid on every page.

import React, { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "../../lib/motion";

export default function Reveal({ as: Tag = "div", children, className, stagger = 0.08, y = 36, ...rest }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const items = ref.current?.querySelectorAll("[data-reveal]");
      if (!items?.length || prefersReducedMotion()) return;
      gsap.set(items, { opacity: 0, y, force3D: true });
      ScrollTrigger.batch(items, {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 1.1,
            ease: "expo.out",
            stagger,
            overwrite: true,
            clearProps: "transform",
          }),
      });
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
