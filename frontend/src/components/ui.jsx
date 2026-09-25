// frontend/src/components/ui.jsx
//
// The small set of primitives every page shares. Deliberately few: a
// button in three weights, the brand mark, and a spinner. Pages compose
// these instead of re-styling a <button> from scratch each time.

import React from "react";
import { motion } from "framer-motion";
import { spring } from "../lib/motion";
import { cn } from "../lib/utils";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 font-medium select-none " +
  "transition-colors duration-200 ease-apple disabled:opacity-40 disabled:pointer-events-none";

const BUTTON_VARIANTS = {
  // The one action a screen exists for.
  primary: "bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed",
  // Secondary actions: quiet fill.
  secondary: "bg-surface-2 text-label hover:bg-surface-3",
  // Inline actions that read as links.
  plain: "text-accent hover:text-accent-hover hover:underline underline-offset-4",
  // Irreversible actions.
  destructive: "bg-critical/15 text-critical hover:bg-critical/25",
};

const BUTTON_SIZES = {
  sm: "h-8 px-3.5 text-footnote rounded-full",
  md: "h-10 px-5 text-callout rounded-full",
  lg: "h-12 px-7 text-body rounded-full",
};

export const Button = React.forwardRef(function Button(
  { variant = "primary", size = "md", className, children, ...props },
  ref
) {
  const sizing = variant === "plain" ? "text-callout" : BUTTON_SIZES[size];
  return (
    <motion.button
      ref={ref}
      whileTap={variant === "plain" ? undefined : { scale: 0.97 }}
      transition={spring.snappy}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], sizing, className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});

// Brand mark: a speech-bubble-shaped monogram. Scales with font size.
export function Logo({ className, showWordmark = true }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-label", className)}>
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
        <rect x="1" y="1" width="26" height="22" rx="7" fill="currentColor" />
        <path d="M8 23 L8 27 L13 23 Z" fill="currentColor" />
        <path
          d="M9 8v8M19.3 9.3A4 4 0 1 0 19.3 14.7"
          stroke="#000"
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showWordmark && <span className="text-[17px] font-semibold tracking-[-0.02em]">InterviewCoach</span>}
    </span>
  );
}

export function Spinner({ className, label = "Loading" }) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block h-5 w-5", className)}>
      <svg viewBox="0 0 24 24" className="h-full w-full animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" fill="none" />
        <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  );
}
