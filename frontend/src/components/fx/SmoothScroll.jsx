// frontend/src/components/fx/SmoothScroll.jsx
//
// Lenis smooth scrolling, driven by GSAP's ticker so Lenis, ScrollTrigger and
// every scrubbed timeline advance on the exact same frame (no jitter between
// the scroll position and scroll-linked animation).
//
// Disabled for prefers-reduced-motion and on work surfaces (interview, coding)
// where the page doesn't scroll and inner panes must scroll natively.

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../../lib/motion";

let activeLenis = null;

export function getLenis() {
  return activeLenis;
}

// Smoothly scroll to an element or selector, falling back to native scrolling.
export function scrollToTarget(target, { offset = -88 } = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (activeLenis) {
    activeLenis.scrollTo(el, { offset, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

// Scroll-triggered animations cache their start/end positions. Anything that
// changes the page height afterwards (webfonts, data arriving, a panel
// growing) leaves every trigger below it stale, which is how reveals end up
// firing in the wrong place or not at all, especially on phones. Watch the
// document height and re-measure (debounced) whenever it changes.
function useAutoRefresh() {
  useEffect(() => {
    let t = 0;
    let last = document.documentElement.scrollHeight;
    const ro = new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (Math.abs(h - last) < 2) return;
      last = h;
      clearTimeout(t);
      t = setTimeout(() => ScrollTrigger.refresh(), 180);
    });
    ro.observe(document.body);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);
}

export default function SmoothScroll({ enabled = true }) {
  useAutoRefresh();
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return undefined;

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      // Nested scroll areas keep native scrolling.
      prevent: (node) =>
        Boolean(node.closest?.("[data-lenis-prevent], .monaco-editor, [role='dialog'], [role='listbox']")),
    });
    activeLenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (activeLenis === lenis) activeLenis = null;
    };
  }, [enabled]);

  return null;
}
