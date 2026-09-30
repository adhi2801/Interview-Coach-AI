// frontend/src/components/fx/AppSmoothScroll.jsx
//
// Smooth, weighted scrolling for the signed-in pages. Lenis on its own
// animation loop — the app has no scroll-scrubbed sequences, so none of the
// landing page's GSAP wiring comes along. Off for reduced motion, and on the
// work surfaces (interview, coding, mic check), whose panes scroll natively.

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { prefersReducedMotion } from "../../lib/motion";

let instance = null;

/** Jump to the top on navigation, whether or not Lenis is running. */
export function resetScroll() {
  if (instance) instance.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}

export default function AppSmoothScroll({ enabled = true }) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return undefined;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
      // Nested scroll areas, the editor, menus and dialogs keep native scrolling.
      prevent: (node) => Boolean(node.closest?.("[data-lenis-prevent], .monaco-editor, [role='dialog'], [role='listbox']")),
    });
    instance = lenis;
    return () => {
      lenis.destroy();
      if (instance === lenis) instance = null;
    };
  }, [enabled]);
  return null;
}
