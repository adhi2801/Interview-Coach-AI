// frontend/src/pages/landing/blueprint.jsx
//
// The structural language of the landing page: a single framed column with
// visible rails, sections separated by hairlines with square markers where
// lines meet, hatched bands as breathing room, and mono section labels.
// Structure is information here — each marker sits on a real boundary.

import React from "react";
import { ScrambleText } from "../../components/fx/Effects";
import { cn } from "../../lib/utils";

export const FRAME = "mx-auto w-full max-w-[1280px]";

// Small square drawn where a horizontal rule meets a rail.
function Marker({ className }) {
  return <span aria-hidden="true" className={cn("absolute z-10 h-[7px] w-[7px] border border-white/25 bg-[#050507]", className)} />;
}

// A framed section. `rule` draws the top hairline with corner markers.
export function Section({ id, children, className, innerClassName, rule = true, as: Tag = "section", ...rest }) {
  return (
    <Tag id={id} className={cn("relative scroll-mt-20", className)} {...rest}>
      <div className={cn(FRAME, "relative border-x border-white/[0.08]", innerClassName)}>
        {rule && (
          <>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
            <Marker className="-left-[4px] -top-[4px]" />
            <Marker className="-right-[4px] -top-[4px]" />
          </>
        )}
        {children}
      </div>
    </Tag>
  );
}

// Diagonal hatch band: visual pause between chapters.
export function Hatch({ className }) {
  return (
    <div aria-hidden="true" className={cn("relative", className)}>
      <div
        className={cn(FRAME, "relative h-14 border-x border-t border-white/[0.08]")}
        style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 11px)" }}
      >
        <Marker className="-left-[4px] -top-[4px]" />
        <Marker className="-right-[4px] -top-[4px]" />
      </div>
    </div>
  );
}

// Mono section label: "::: 02 / THE INTERVIEW"
export function Label({ index, children, className }) {
  return (
    <div className={cn("flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-300", className)}>
      <span aria-hidden="true" className="grid grid-cols-2 gap-[2px]">
        <span className="h-[3px] w-[3px] bg-indigo-400" />
        <span className="h-[3px] w-[3px] bg-indigo-400/40" />
        <span className="h-[3px] w-[3px] bg-indigo-400/40" />
        <span className="h-[3px] w-[3px] bg-indigo-400" />
      </span>
      {index && <span className="text-white/35">{index} /</span>}
      <ScrambleText>{children}</ScrambleText>
    </div>
  );
}

// Iridescent display text (static gradient — no per-frame repaint).
export function Iridescent({ children, className }) {
  return <span className={cn("text-iridescent", className)}>{children}</span>;
}
