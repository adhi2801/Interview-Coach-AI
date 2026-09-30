// frontend/src/components/app/LegalPage.jsx
//
// Privacy and Terms in the blueprint language: a framed hero band with the
// dot field, then numbered clauses laid out like a spec sheet (number and
// title on the left, the text on the right), revealed on scroll in both
// directions. A contents rail stays in view on desktop.

import React, { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { cn } from "../../lib/utils";
import { prefersReducedMotion } from "../../lib/motion";
import { FRAME } from "./frame";
import { FOCUS, Mark, PageIntro } from "./AppChrome";

export default function LegalPage({ title, intro, sections, meta, copyTitle, onGoBack }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = sections.map((s) => `${s.title}\n${s.body}`).join("\n\n");
    navigator.clipboard
      .writeText(`${copyTitle}\n\n${text}\n\n${meta}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  const anchor = (i) => `clause-${i + 1}`;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050507] font-sans text-white selection:bg-indigo-500/40">
      <header className="nav-glass sticky top-0 z-40 border-b border-white/[0.08]">
        <div className={cn(FRAME, "flex h-16 items-center justify-between border-x border-white/[0.08] px-5")}>
          <button onClick={onGoBack} className={cn("flex items-center gap-3 rounded", FOCUS)}>
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">InterviewCoach</span>
          </button>
          <button onClick={onGoBack} className={cn("flex items-center gap-1.5 text-[14px] text-white/60 transition-colors hover:text-white", FOCUS)}>
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </button>
        </div>
      </header>

      <PageIntro title={title} subtitle={intro} />

      <div className={cn(FRAME, "grid grid-cols-1 border-x border-white/[0.08] lg:grid-cols-12")}>
        <aside className="hidden border-r border-white/[0.08] lg:col-span-3 lg:block">
          <nav aria-label="Contents" className="sticky top-16 px-8 py-10">
            <p className="text-[13px] text-white/55">Contents</p>
            <ol className="mt-4 space-y-2.5">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <a
                    href={`#${anchor(i)}`}
                    onClick={(e) => { e.preventDefault(); document.getElementById(anchor(i))?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" }); }}
                    className={cn("flex gap-2 text-[13px] text-white/55 transition-colors hover:text-white", FOCUS)}
                  >
                    <span className="tabular-nums text-white/40">{i + 1}.</span> {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="lg:col-span-9">
          <div>
            {sections.map((s, i) => (
              <section key={s.title} id={anchor(i)} className="grid scroll-mt-24 grid-cols-1 gap-3 border-b border-white/[0.08] px-6 py-10 md:grid-cols-12 md:gap-8 md:px-10">
                <div className="md:col-span-4">
                  <h2 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-white">
                    <span className="tabular-nums text-white/40">{i + 1}.</span> {s.title}
                  </h2>
                </div>
                <p className="text-[15px] leading-relaxed text-white/60 md:col-span-8">{s.body}</p>
              </section>
            ))}
          </div>
          <div className="flex flex-col gap-3 px-6 py-6 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between md:px-10">
            <button onClick={handleCopy} className={cn("flex items-center gap-1.5 text-white/55 transition-colors hover:text-white", FOCUS)}>
              {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy text</>}
            </button>
            <span>{meta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
