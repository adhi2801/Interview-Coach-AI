import { useState, useEffect } from "react";

// Returns true if viewport width is at or below the given breakpoint (default 768px).
// Use this to skip expensive decorative effects (blur, ambient glows, heavy
// animations) on mobile, where they cause real jank on weaker GPUs.
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}