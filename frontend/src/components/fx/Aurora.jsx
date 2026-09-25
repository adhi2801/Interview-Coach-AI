// frontend/src/components/fx/Aurora.jsx
//
// The living backdrop behind the glass: slow-drifting colour fields in the
// brand palette (indigo, blue, emerald), film grain on top. Pure CSS
// transforms on composited layers — no JS per frame, no layout, and it
// pauses entirely for reduced motion. Glass needs something rich behind it
// to refract; this is that something.

import React from "react";
import { cn } from "../../lib/utils";

// still: holds the colour fields in place. Used behind the signed-in app,
// where many panels use backdrop blur — a moving backdrop would force every
// one of them to re-blur on every frame.
export default function Aurora({ className, intensity = 1, fixed = true, grain = true, still = false }) {
  return (
    <div
      aria-hidden="true"
      className={cn("aurora pointer-events-none inset-0 overflow-hidden", fixed ? "fixed" : "absolute", still && "aurora-still", className)}
      style={{ "--aurora-intensity": intensity }}
    >
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-vignette" />
      {grain && <div className="aurora-grain" />}
    </div>
  );
}
