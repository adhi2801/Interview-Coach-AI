import React, { useState } from "react";
import { Check, Keyboard, Play } from "lucide-react";
import { COMPANIES } from "../constants/companies";
import { AppHeader, Frame, FOCUS, PageIntro } from "../components/app/AppChrome";
import MicrophoneCheck from "../components/app/MicrophoneCheck";
import { cn } from "../lib/utils";

// Between setup and the interview: a chance to check the microphone before
// answering by voice. Voice is optional — every answer can be typed — so
// neither button waits on the microphone.
export default function PreflightCheck({ onReady, onSkip, sessionData }) {
  const [heard, setHeard] = useState(false);

  const company = sessionData?.company
    ? COMPANIES.find((c) => c.id === sessionData.company.toLowerCase())?.name || sessionData.company
    : null;
  const brief = company && sessionData?.role
    ? `Your ${company} ${sessionData.role} interview${sessionData.persona ? ` with the ${sessionData.persona} interviewer` : ""} is ready.`
    : "Your interview is ready.";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-transparent font-sans text-slate-100 selection:bg-indigo-500/40">
      <AppHeader />
      <PageIntro
        title="Check your microphone"
        subtitle={`${brief} You can answer by voice or by typing; by voice, the live coach also tracks your pace and filler words.`}
      />
      <Frame innerClassName="border-b border-white/[0.08]">
        <div className="mx-auto max-w-2xl px-5 py-10 md:px-8">
          <MicrophoneCheck autoStart onHeard={() => setHeard(true)} />

          <div className="mt-8 border-l-2 border-indigo-300/50 pl-4">
            <p className="text-[13px] text-white/55">Say something like</p>
            <p className="mt-1 text-[17px] leading-relaxed text-white">“I'd start by clarifying the requirements and the expected load.”</p>
          </div>
          <p role="status" className={cn("mt-4 flex items-center gap-2 text-[14px]", heard ? "text-emerald-300" : "text-white/55")}>
            {heard ? <><Check size={15} aria-hidden="true" /> We can hear you.</> : "The level bar should move while you speak."}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onReady}
              className={cn("btn-liquid flex items-center justify-center gap-2 px-6 py-3 text-[15px] font-semibold", FOCUS)}>
              <Play size={14} aria-hidden="true" /> Start the interview
            </button>
            <button type="button" onClick={onSkip}
              className={cn("flex items-center justify-center gap-2 border border-white/15 px-5 py-3 text-[15px] text-white/80 hover:bg-white/[0.06] hover:text-white", FOCUS)}>
              <Keyboard size={15} aria-hidden="true" /> Skip, I'll type my answers
            </button>
          </div>
        </div>
      </Frame>
    </div>
  );
}
