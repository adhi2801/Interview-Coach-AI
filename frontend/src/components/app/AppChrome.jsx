// frontend/src/components/app/AppChrome.jsx
//
// The frame every signed-in page shares:
//   AppHeader        — the bar: IC mark, the six sections in plain words
//                      with the current one marked, rating, account menu
//   PageIntro        — the page's heading band: title, one sentence and an
//                      optional aside (usually the page's main action)
//   RoomBackdrop     — the glass room: slow soft light behind one frosted
//                      pane that runs the full height of the page column
//
// Pages get the user, logout and the command palette from AppChromeContext
// (provided once in App), so no page has to thread new props.

import React, { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, LogOut, Menu, Search, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "../../lib/navigation";
import { ease } from "../../lib/motion";
import { cn, MOD_KEY } from "../../lib/utils";
import { FRAME } from "./frame";


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

export function RoomBackdrop() {
  return (
    <div aria-hidden="true" className="room pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <span className="room-light room-light--indigo" />
      <span className="room-light room-light--violet" />
      <span className="room-light room-light--teal" />
      <div className={cn(FRAME, "room-pane relative h-full")} />
      <div className="room-grain" />
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
      <nav aria-label="App" className={cn(FRAME, "flex h-16 items-center justify-between gap-4 px-4 md:px-5")}>
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <button onClick={back.onClick} className={cn("mr-1 flex items-center xl:hidden gap-1.5 glass-control rounded-lg px-2.5 py-1.5 text-[13px] text-white/70 transition-colors hover:border-white/30 hover:text-white", FOCUS)}>
              <ArrowLeft size={12} /> {back.label || "Back"}
            </button>
          )}
          <button onClick={() => navigate("/")} className={cn("flex items-center gap-3 rounded", FOCUS)}>
            <Mark />
            <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">InterviewCoach</span>
          </button>
        </div>

        <ul className="hidden items-center gap-6 xl:flex">
          {APP_NAV.map((n) => {
            const on = n.match(pathname);
            return (
              <li key={n.to} className="relative">
                <button
                  onClick={() => navigate(n.to)}
                  aria-current={on ? "page" : undefined}
                  className={cn("whitespace-nowrap text-[14px] transition-colors", on ? "text-white" : "text-white/60 hover:text-white", FOCUS)}
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
            <button onClick={openPalette} className={cn("hidden items-center gap-2 glass-control rounded-lg px-2.5 py-1.5 text-[13px] text-white/60 transition-colors hover:border-white/30 hover:text-white lg:flex", FOCUS)}>
              <Search size={13} aria-hidden="true" /> Search <kbd className="font-mono text-[11.5px] text-white/50">{MOD_KEY}+K</kbd>
            </button>
          )}
          {elo != null && (
            <span className="hidden items-center gap-1.5 px-1 text-[13px] text-white/60 sm:flex">
              Rating <span className="text-[14px] font-semibold tabular-nums text-white">{elo.toLocaleString("en-US")}</span>
            </span>
          )}
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-label="Account menu" className={cn("grid h-8 w-8 place-items-center glass-control rounded-lg bg-white/[0.06] text-[13px] font-semibold text-white hover:bg-white/[0.1]", FOCUS)}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: ease.out }}
                  className="glass absolute right-0 top-full z-50 mt-3 w-60 rounded-xl p-1"
                >
                  <div className="border-b border-white/[0.06] px-3 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || "Candidate"}</p>
                    <p className="truncate text-[13px] text-white/55">{user?.email || ""}</p>
                  </div>
                  <button onClick={() => navigate("/settings")} className="w-full px-3 py-2.5 text-left text-[14px] text-white/75 hover:bg-white/[0.04] hover:text-white">Settings</button>
                  {onLogout && (
                    <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-rose-200 hover:bg-rose-500/10">
                      <LogOut size={13} aria-hidden="true" /> Log out
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} className={cn("grid h-8 w-8 place-items-center glass-control rounded-lg text-white/70 xl:hidden", FOCUS)}>
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
            <ul className={cn(FRAME, "grid grid-cols-2 sm:grid-cols-3")}>
              {APP_NAV.map((n, i) => {
                const on = n.match(pathname);
                return (
                  <li key={n.to} className={cn("border-b border-white/[0.06]", i % 2 === 0 && "border-r sm:border-r-0", "sm:[&:not(:nth-child(3n))]:border-r")}>
                    <button onClick={() => navigate(n.to)} aria-current={on ? "page" : undefined} className={cn("flex w-full items-center gap-2 px-5 py-4 text-left text-[15px]", on ? "text-white" : "text-white/65")}>
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

// The heading band at the top of a page: title, one sentence, and an
// optional aside (usually the page's main action).
export function PageIntro({ title, subtitle, aside, children, className }) {
  return (
    <section className={cn("relative", className)}>
      <div className={cn(FRAME, "relative border-b border-white/[0.07]")}>
        <div className="relative flex flex-col gap-6 px-5 pb-9 pt-10 md:px-10 md:pt-12 lg:flex-row lg:items-end lg:justify-between">
          {/* The page's one entrance: the title surfaces from behind the glass. */}
          <motion.div initial={{ opacity: 0, y: 12, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: ease.expo }} className="min-w-0 max-w-3xl">
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-white md:text-[44px]">{title}</h1>
            {subtitle && <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-white/60">{subtitle}</p>}
          </motion.div>
          {aside && <div className="shrink-0">{aside}</div>}
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
      <div className={cn(FRAME, "relative", innerClassName)}>{children}</div>
    </div>
  );
}

// Spec-sheet stat cell.
export function Stat({ value, label, className }) {
  return (
    <div className={cn("px-5 py-5 md:px-7", className)}>
      <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white md:text-4xl">{value}</p>
      <p className="mt-1 text-[13px] text-white/55">{label}</p>
    </div>
  );
}
