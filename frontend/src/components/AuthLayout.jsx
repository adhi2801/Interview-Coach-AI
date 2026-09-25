// frontend/src/components/AuthLayout.jsx
//
// Shared shell + form field for Login and Signup. One centered column, the
// brand mark, a title, and the form — nothing competing with the task.

import React, { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "./ui";
import { ease, reveal } from "../lib/motion";
import { cn } from "../lib/utils";

export function AuthLayout({ title, subtitle, onBackToHome, footer, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas px-5 text-label">
      <header className="mx-auto flex h-14 w-full max-w-page items-center justify-between">
        <button onClick={onBackToHome} aria-label="Back to home" className="rounded-md">
          <Logo className="[&_svg]:h-6 [&_svg]:w-6 [&_span]:text-[15px]" />
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center py-12">
        <motion.div variants={reveal} initial="hidden" animate="show" className="w-full max-w-[400px]">
          <h1 className="text-center font-display text-title font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-callout text-label-2">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-8 text-center text-callout text-label-2">{footer}</div>}
        </motion.div>
      </main>
    </div>
  );
}

export function Field({ label, hint, error, type = "text", reveal: canReveal = false, className, ...inputProps }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const [visible, setVisible] = useState(false);
  const inputType = canReveal ? (visible ? "text" : "password") : type;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-footnote text-label-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-control border bg-surface-2 px-4 text-body text-label transition-[border-color,box-shadow] duration-200",
            canReveal && "pr-12",
            error ? "border-critical/70" : "border-transparent"
          )}
          {...inputProps}
        />
        {canReveal && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-label-3 transition-colors hover:text-label"
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {(error || hint) && (
          <motion.p
            key={error ? "error" : "hint"}
            id={error ? `${id}-error` : `${id}-hint`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: ease.out }}
            className={cn("overflow-hidden pt-2 text-footnote", error ? "text-critical" : "text-label-3")}
          >
            {error || hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Form-level error: says what happened and, where possible, what to do.
export function FormError({ message }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: ease.out }}
          className="rounded-control bg-critical/10 px-4 py-3 text-callout text-critical"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
