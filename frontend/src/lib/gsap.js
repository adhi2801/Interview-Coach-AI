// frontend/src/lib/gsap.js
//
// GSAP + ScrollTrigger + SplitText for the landing page's choreographed,
// scroll-scrubbed and per-line text sequences. Imported only from landing
// code (and the fx components it uses), so it ships in the landing chunk.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export { gsap, ScrollTrigger, SplitText, useGSAP };
