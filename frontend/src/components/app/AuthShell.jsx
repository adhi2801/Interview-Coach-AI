// frontend/src/components/app/AuthShell.jsx
//
// The signed-out account pages (log in, sign up, forgot and reset password):
// one narrow column with a heading, a sentence, the form and a footer line,
// in the same plain language as the app. Plus the form pieces they share.

import React, { useState } from "react";
import { AlertTriangle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";
import { FOCUS, Mark } from "./AppChrome";

export default function AuthShell({ title, intro, onBackToHome, footer, children }) {
  return (
    <div className="min-h-screen bg-[#050507] font-sans text-white selection:bg-indigo-500/40">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_50%_-20%,rgba(79,70,229,0.14),transparent_65%)]" />
      <header className="relative border-b border-white/[0.08]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <button type="button" onClick={onBackToHome} className={cn("flex items-center gap-3", FOCUS)}>
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">InterviewCoach</span>
          </button>
          {onBackToHome && (
            <button type="button" onClick={onBackToHome} className={cn("flex items-center gap-1.5 text-[14px] text-white/60 hover:text-white", FOCUS)}>
              <ArrowLeft size={14} aria-hidden="true" /> Home
            </button>
          )}
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[400px] px-5 py-14 md:py-24">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {intro && <p className="mt-2 text-[15px] leading-relaxed text-white/60">{intro}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-white/[0.08] pt-6 text-[14px] text-white/60">{footer}</div>}
      </main>
    </div>
  );
}

export const inputClass =
  "w-full border border-white/15 bg-[#0a0a10] px-3.5 py-2.5 text-[15px] text-white placeholder-white/35 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300/60 aria-[invalid=true]:border-rose-400";

export function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] text-white/80">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-white/55">{hint}</p>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder = "••••••••", describedBy, autoFocus }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const readCaps = (e) => setCapsLock(Boolean(e.getModifierState?.("CapsLock")));
  return (
    <>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} required autoComplete={autoComplete} autoFocus={autoFocus}
          value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={readCaps} onKeyUp={readCaps}
          placeholder={placeholder} aria-describedby={describedBy} className={cn(inputClass, "pr-11")} />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}
          className={cn("absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/55 hover:text-white", FOCUS)}>
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-amber-200"><AlertTriangle size={13} aria-hidden="true" /> Caps Lock is on</p>
      )}
    </>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return <p role="alert" className="border-l-2 border-rose-400 pl-3 text-[14px] text-rose-200">{children}</p>;
}

export function SubmitButton({ loading, loadingText, children }) {
  return (
    <button type="submit" disabled={loading}
      className={cn("btn-liquid flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold disabled:cursor-wait disabled:opacity-70", FOCUS)}>
      {loading && <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />}
      {loading ? loadingText : children}
    </button>
  );
}

export function TextLink({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={cn("font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white", FOCUS)}>
      {children}
    </button>
  );
}
