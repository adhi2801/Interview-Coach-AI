// frontend/src/lib/motion.js
//
// One motion vocabulary for the whole app: easing curves, springs and
// durations for Motion (motion/react), plus the reduced-motion and pointer
// checks. GSAP, only the landing page's scroll sequences use, lives in
// lib/gsap.js so the signed-in app never downloads it.

// Easing curves, as cubic-bezier arrays for Motion and names for GSAP.
export const ease = {
  // Apple's signature curve: quick departure, long gentle settle.
  apple: [0.28, 0.11, 0.32, 1],
  // Expressive "expo out" for reveals.
  expo: [0.16, 1, 0.3, 1],
  // Snappy UI response.
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
};

export const spring = {
  // Buttons, toggles, chips — immediate and crisp.
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  // Cards, panels, sheets — soft landing.
  soft: { type: "spring", stiffness: 240, damping: 28, mass: 1 },
  // Magnetic pull / cursor following — floaty.
  float: { type: "spring", stiffness: 150, damping: 15, mass: 0.2 },
  // Glass tilt.
  tilt: { stiffness: 220, damping: 20, mass: 0.6 },
};

export const duration = { fast: 0.2, base: 0.45, slow: 0.9, cinematic: 1.4 };

// Shared entrance variants: rise + de-blur. `custom` = stagger index.
export const riseIn = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease: ease.expo, delay: i * 0.08 },
  }),
};

export const staggerParent = (stagger = 0.08, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Fine pointer = a real mouse/trackpad. Hover-driven effects (tilt, magnetic
// pull, cursor light) are skipped on touch, where they'd only get in the way.
export function hasFinePointer() {
  return typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
}
