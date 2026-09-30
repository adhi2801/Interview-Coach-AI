// "How it's built": the engineering story that used to sit on the landing
// page — the request paths and the build log — for anyone who wants to look
// under the hood. The landing page itself stays about the product.

import React from "react";
import { ArrowLeft } from "lucide-react";
import SmoothScroll from "../components/fx/SmoothScroll";
import { FOCUS, Mark, PageIntro } from "../components/app/AppChrome";
import { FRAME } from "../components/app/frame";
import { BuildLog, Footer, Stack } from "./landing/LowerSections";
import { cn } from "../lib/utils";

export default function About({ onGoBack, onNavigatePrivacy, onNavigateTerms }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050507] font-sans text-white selection:bg-indigo-500/40">
      <SmoothScroll />
      <header className="nav-glass sticky top-0 z-40">
        <div className={cn(FRAME, "flex h-16 items-center justify-between px-5")}>
          <button type="button" onClick={onGoBack} className={cn("flex items-center gap-3 rounded", FOCUS)}>
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">InterviewCoach</span>
          </button>
          <button type="button" onClick={onGoBack} className={cn("flex items-center gap-1.5 text-[14px] text-white/60 transition-colors hover:text-white", FOCUS)}>
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </button>
        </div>
      </header>
      <PageIntro title="How it's built"
        subtitle="The request paths behind an interview and a coding submission, and the notes from building it: a FastAPI service, PostgreSQL, Redis, Claude for questions and scoring, and Judge0 for sandboxed code." />
      <main>
        <Stack />
        <BuildLog />
      </main>
      <Footer nav={[]} onNavigatePrivacy={onNavigatePrivacy} onNavigateTerms={onNavigateTerms} />
    </div>
  );
}
