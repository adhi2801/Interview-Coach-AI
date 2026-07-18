import { useEffect } from "react";

/**
 * Modal — the ONE component in the design system allowed to use a
 * real drop-shadow. Every card in the app uses a flat 1px border for
 * separation — but a modal floats ABOVE the page, and a border alone
 * doesn't read as "elevated" the way real dark-mode software (Linear,
 * Vercel) handles dropdowns and dialogs. This is the documented
 * exception, not a violation of the no-shadow rule.
 *
 * Usage:
 *   <Modal open={showPlan} onClose={() => setShowPlan(false)} title="Study Plan">
 *     ...content...
 *   </Modal>
 */
export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-header">
          {title && <h2 className="ds-modal-title">{title}</h2>}
          <button className="ds-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ds-modal-body">{children}</div>
      </div>
    </div>
  );
}