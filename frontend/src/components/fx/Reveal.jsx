// frontend/src/components/fx/Reveal.jsx
//
// Staggered scroll reveal for groups. Every descendant marked [data-reveal]
// rises into place when it enters the viewport — in BOTH directions:
//   - scrolling down, items rise up from below as they enter at the bottom
//   - scrolling back up, items drop down from above as they enter at the top
// Items that leave the viewport are quietly reset (they're off-screen, so
// nothing visibly disappears) so the next entry animates again.
// ScrollTrigger.batch groups items that enter together into one cascade.

import React, { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "../../lib/motion";

export default function Reveal({ as: Tag = "div", children, className, stagger = 0.08, y = 36, ...rest }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const items = ref.current?.querySelectorAll("[data-reveal]");
      if (!items?.length || prefersReducedMotion()) return;
      gsap.set(items, { opacity: 0, y, force3D: true });
      const show = (batch, from) =>
        gsap.fromTo(
          batch,
          { opacity: 0, y: from },
          { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger, overwrite: true }
        );
      const hide = (batch, to) => gsap.set(batch, { opacity: 0, y: to, overwrite: true });
      ScrollTrigger.batch(items, {
        start: "top 92%",
        end: "bottom 8%",
        onEnter: (b) => show(b, y),
        onEnterBack: (b) => show(b, -y),
        onLeave: (b) => hide(b, -y),
        onLeaveBack: (b) => hide(b, y),
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
