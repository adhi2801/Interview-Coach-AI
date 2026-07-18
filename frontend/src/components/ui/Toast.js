import { useEffect } from "react";

/**
 * Toast — rule 23 (Unstuck State / no browser alerts).
 * Never use window.alert() anywhere in this app. This is what
 * replaces it — a dismissible notification that doesn't block
 * the UI or take the user out of context.
 *
 * For actual failed-request retry states (e.g. a card that failed
 * to load), don't use this — use the inline retry pattern instead
 * (a muted "Retry" link inside the failed section itself). Toast is
 * for transient confirmations/errors, not persistent failure states.
 *
 * Usage:
 *   <Toast message="Session saved" variant="success" onDismiss={() => setToast(null)} />
 */
export default function Toast({ message, variant = "default", onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className={`ds-toast ds-toast-${variant}`} role="status">
      <span className="ds-toast-message">{message}</span>
      <button className="ds-toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}