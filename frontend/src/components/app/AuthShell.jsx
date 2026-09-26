// frontend/src/components/app/AuthShell.jsx
//
// Sign in / sign up in the landing page's blueprint language: framed column
// with rails, a dot-field panel with a mono label and iridescent display
// type, and the form in a hairline card. Every line of copy is a plain,
// checkable fact about the product (no "enterprise grade" anything).

import React from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import DotField from "../fx/DotField";
import SplitReveal from "../fx/SplitReveal";
import { ease } from "../../lib/motion";
import { cn } from "../../lib/utils";
import { FRAME, Label } from "../../pages/landing/blueprint";
import { FOCUS, Mark } from "./AppChrome";

export default function AuthShell({ label, title, accent, body, points, onBackToHome, children }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050507] font-sans text-white selection:bg-indigo-500/40">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_70%_-10%,rgba(79,70,229,0.18),transparent_65%)]" />
      </div>

      <header className="nav-glass sticky top-0 z-40 border-b border-white/[0.08]">
        <div className={cn(FRAME, "flex h-16 items-center justify-between border-x border-white/[0.08] px-5")}>
          <button onClick={onBackToHome} className={cn("flex items-center gap-3 rounded", FOCUS)}>
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">InterviewCoach</span>
          </button>
          {onBackToHome && (
            <button onClick={onBackToHome} className={cn("flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/55 transition-colors hover:text-white", FOCUS)}>
              <ArrowLeft size={13} /> Home
            </button>
          )}
        </div>
      </header>

      <main className={cn(FRAME, "relative grid min-h-[calc(100vh-4rem)] grid-cols-1 border-x border-white/[0.08] lg:grid-cols-12")}>
        {/* Story panel */}
        <section className="relative hidden overflow-hidden border-r border-white/[0.08] lg:col-span-6 lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="absolute inset-0">
            <DotField className="opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(5,5,7,0.3),#050507_80%)]" />
          </div>
          <div className="relative px-10 pt-16 xl:px-14">
            <Label>{label}</Label>
            <SplitReveal as="h1" by="lines" trigger="mount" delay={0.1} className="mt-7 text-5xl font-semibold leading-[1] tracking-[-0.045em] xl:text-6xl">
              {title}
            </SplitReveal>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.9, ease: ease.expo }} className="text-iridescent mt-1 text-5xl font-semibold leading-[1.05] tracking-[-0.045em] xl:text-6xl">
              {accent}
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.9, ease: ease.expo }} className="mt-6 max-w-md text-[15.5px] leading-relaxed text-white/55">
              {body}
            </motion.p>
          </div>
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
            className="relative grid grid-cols-1 border-t border-white/[0.08] bg-[#050507]/70 xl:grid-cols-3"
          >
            {points.map((p, i) => (
              <motion.li
                key={p.k}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.expo } } }}
                className={cn("px-8 py-6", i < points.length - 1 && "border-b border-white/[0.08] xl:border-b-0 xl:border-r")}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-indigo-300">{p.k}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">{p.v}</p>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        {/* Form */}
        <section className="relative flex items-center justify-center px-5 py-12 lg:col-span-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: ease.expo }}
            className="relative w-full max-w-[420px] border border-white/10 bg-[#07070b]/95 p-7 shadow-[0_40px_120px_-40px_rgba(79,70,229,0.55)] md:p-9"
          >
            <span aria-hidden="true" className="absolute -left-[4px] -top-[4px] h-[7px] w-[7px] border border-white/25 bg-[#050507]" />
            <span aria-hidden="true" className="absolute -right-[4px] -top-[4px] h-[7px] w-[7px] border border-white/25 bg-[#050507]" />
            <span aria-hidden="true" className="absolute -bottom-[4px] -left-[4px] h-[7px] w-[7px] border border-white/25 bg-[#050507]" />
            <span aria-hidden="true" className="absolute -bottom-[4px] -right-[4px] h-[7px] w-[7px] border border-white/25 bg-[#050507]" />
            <div className="mb-6 lg:hidden">
              <Label>{label}</Label>
            </div>
            {children}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
