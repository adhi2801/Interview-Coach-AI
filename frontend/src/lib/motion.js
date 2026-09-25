// frontend/src/lib/motion.js
//
// Shared motion vocabulary. Motion in this product has two jobs only:
//   1. answer a person's action (open, confirm, expand) — `spring.snappy`
//   2. one orchestrated reveal per page — `reveal` + `ease.apple`
// Nothing loops for decoration. <MotionConfig reducedMotion="user"> in App
// turns all transform animation off for people who ask their OS for that.

export const ease = {
  // Apple's standard curve: quick departure, long gentle settle.
  apple: [0.28, 0.11, 0.32, 1],
  out: [0.25, 0.1, 0.25, 1],
  inOut: [0.42, 0, 0.58, 1],
};

export const duration = {
  quick: 0.2,
  base: 0.4,
  slow: 0.8,
};

export const spring = {
  // Buttons, toggles, small surfaces.
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.8 },
  // Sheets, dialogs, panels.
  gentle: { type: "spring", stiffness: 260, damping: 32, mass: 1 },
};

// Page-level entrance: content rises a short distance and sharpens.
export const reveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease: ease.apple, delay: i * 0.08 },
  }),
};

// Route transitions: a quick crossfade, no sliding — navigation should
// feel instant, not theatrical.
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.28, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: ease.out } },
};
