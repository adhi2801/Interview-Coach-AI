// frontend/src/components/app/AppChrome.jsx
//
// The landing page's blueprint language, applied to every signed-in page:
//   AppHeader        — the same glass bar, framed rails, IC mark and mono
//                      links as the landing nav, with the active page marked
//   PageIntro        — a framed hero band: dot field, mono section label,
//                      big display title revealed on mount, optional aside
//   BlueprintBackdrop — the flat #050507 field with the frame rails running
//                      the full height of the page, plus a soft top glow
//
// Pages get the user, logout and the command palette from AppChromeContext
// (provided once in App), so no page has to thread new props.

import React, { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, LogOut, Menu, Search, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import DotField from "../fx/DotField";
import SplitReveal from "../fx/SplitReveal";
import { useTransitionNavigate } from "../../lib/navigation";
import { ease } from "../../lib/motion";
import { cn } from "../../lib/utils";
import { FRAME, Label } from "../../pages/landing/blueprint";

export const AppChromeContext = createContext({ user: null, onLogout: null, openPalette: null });

export const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export const APP_NAV = [
  { to: "/", label: "Overview", match: (p) => p === "/" },
  { to: "/setup", label: "Interview", match: (p) => p.startsWith("/setup") },
  { to: "/coding", label: "Coding", match: (p) => p.startsWith("/coding") },
  { to: "/study-plan", label: "Knowledge graph", match: (p) => p.startsWith("/study-plan") },
  { to: "/replay", label: "Sessions", match: (p) => p.startsWith("/replay") },
  { to: "/settings", label: "Settings", match: (p) => p.startsWith("/settings") },
];

export function Mark({ className }) {
  return <span className={cn("grid h-7 w-7 shrink-0 place-items-center bg-white text-[10px] font-extrabold text-black", className)}>IC</span>;
}

export function BlueprintBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#050507]">
      <div className="absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(79,70,229,0.16),transparent_65%)]" />
      <div className={cn(FRAME, "relative h-full border-x border-white/[0.06]")} />
    </div>
  );
}

// `children` renders on the right of the bar (page-specific controls).
export function AppHeader({ children, back }) {
  const { user, onLogout, openPalette } = useContext(AppChromeContext);
  const navigate = useTransitionNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);
  const elo = user?.elo_rating != null ? Math.round(user.elo_rating) : null;

  return (
    <header className="nav-glass sticky top-0 z-50 border-b border-white/[0.08]">
      <nav aria-label="App" className={cn(FRAME, "flex h-16 items-center justify-between gap-4 border-x border-white/[0.08] px-4 md:px-5")}>
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <button onClick={back.onClick} className={cn("mr-1 flex items-center xl:hidden gap-1.5 border border-white/10 px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/30 hover:text-white", FOCUS)}>
              <ArrowLeft size={12} /> {back.label || "Back"}
            </button>
          )}
          <button onClick={() => navigate("/")} className={cn("flex items-center gap-3 rounded", FOCUS)}>
            <Mark />
            <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">InterviewCoach</span>
          </button>
        </div>

        <ul className="hidden items-center gap-5 xl:flex">
          {APP_NAV.map((n) => {
            const on = n.match(pathname);
            return (
              <li key={n.to} className="relative">
                <button
                  onClick={() => navigate(n.to)}
                  aria-current={on ? "page" : undefined}
                  className={cn("whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] transition-colors", on ? "text-white" : "text-white/50 hover:text-white", FOCUS)}
                >
                  {n.label}
                </button>
                {on && <motion.span layoutId="app-nav-mark" className="absolute -bottom-[22px] left-0 h-px w-full bg-indigo-400" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {children}
          {openPalette && (
            <button onClick={openPalette} className={cn("hidden items-center gap-2 border border-white/10 px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50 transition-colors hover:border-white/30 hover:text-white lg:flex", FOCUS)}>
              <Search size={12} /> Search <kbd className="text-white/35">⌘K</kbd>
            </button>
          )}
          {elo != null && (
            <span className="hidden items-center gap-1.5 border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-indigo-200 sm:flex">
              ELO <span className="tabular-nums text-white">{elo}</span>
            </span>
          )}
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-label="Account menu" className={cn("grid h-8 w-8 place-items-center bg-linear-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white", FOCUS)}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: ease.out }}
                  className="absolute right-0 top-full z-50 mt-3 w-60 border border-white/10 bg-[#07070b] p-1 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)]"
                >
                  <div className="border-b border-white/[0.06] px-3 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || "Candidate"}</p>
                    <p className="truncate font-mono text-[10.5px] text-white/40">{user?.email || ""}</p>
                  </div>
                  <button onClick={() => navigate("/settings")} className="w-full px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.14em] text-white/65 hover:bg-white/[0.04] hover:text-white">Settings</button>
                  {onLogout && (
                    <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.14em] text-rose-300 hover:bg-rose-500/10">
                      <LogOut size={12} /> Log out
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} className={cn("grid h-8 w-8 place-items-center border border-white/10 text-white/70 xl:hidden", FOCUS)}>
            {open ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </nav>

      {/* Phones / tablets: the nav drops down as a framed sheet. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: ease.expo }}
            className="overflow-hidden border-t border-white/[0.08] xl:hidden"
          >
            <ul className={cn(FRAME, "grid grid-cols-2 border-x border-white/[0.08] sm:grid-cols-3")}>
              {APP_NAV.map((n, i) => {
                const on = n.match(pathname);
                return (
                  <li key={n.to} className={cn("border-b border-white/[0.06]", i % 2 === 0 && "border-r sm:border-r-0", "sm:[&:not(:nth-child(3n))]:border-r")}>
                    <button onClick={() => navigate(n.to)} className={cn("flex w-full items-center gap-2 px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.14em]", on ? "text-white" : "text-white/55")}>
                      <span className={cn("h-1.5 w-1.5", on ? "bg-indigo-400" : "bg-white/20")} /> {n.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Framed hero band at the top of a page.
export function PageIntro({ index, label, title, accent, subtitle, aside, children, className, dots = true }) {
  return (
    <section className={cn("relative", className)}>
      <div className={cn(FRAME, "relative overflow-hidden border-x border-b border-white/[0.08]")}>
        {dots && (
          <div aria-hidden="true" className="absolute inset-0">
            <DotField cell={11} intensity={0.75} className="opacity-70" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(5,5,7,0.25),#050507_78%)]" />
          </div>
        )}
        <div className="relative flex flex-col gap-8 px-5 pb-10 pt-12 md:px-10 md:pt-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <Label index={index}>{label}</Label>
            <SplitReveal as="h1" by="lines" trigger="mount" delay={0.05} className="mt-6 text-[40px] font-semibold leading-[1] tracking-[-0.045em] text-white md:text-6xl">
              {title}
            </SplitReveal>
            {accent && (
              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8, ease: ease.expo }} className="text-iridescent mt-1 text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] md:text-6xl">
                {accent}
              </motion.p>
            )}
            {subtitle && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8, ease: ease.expo }} className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/55">
                {subtitle}
              </motion.p>
            )}
          </div>
          {aside && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.8, ease: ease.expo }} className="shrink-0">
              {aside}
            </motion.div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

// A framed band for page content, matching the landing's Section.
export function Frame({ children, className, innerClassName }) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(FRAME, "relative border-x border-white/[0.08]", innerClassName)}>{children}</div>
    </div>
  );
}

// Spec-sheet stat cell.
export function Stat({ value, label, className }) {
  return (
    <div className={cn("px-5 py-5 md:px-7", className)}>
      <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white md:text-4xl">{value}</p>
      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">{label}</p>
    </div>
  );
}
