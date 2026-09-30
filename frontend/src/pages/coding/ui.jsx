// The coding room's dropdown (a portaled listbox) and glass panel.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export function CustomDropdown({ value, options, onChange, icon: Icon, placeholder, label, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null); // portaled menu is no longer a DOM child of dropdownRef

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inButton = dropdownRef.current && dropdownRef.current.contains(event.target);
      const inMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!inButton && !inMenu) setIsOpen(false);
    };
    // capture phase so a Monaco/editor click handler further down the tree
    // can't stopPropagation() its way past this before we see it
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Measures + clamps synchronously so nothing can render mid-transform or off-viewport.
  const computeCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const margin = 12;
    // Prefer left-aligned to the button; if that would overflow the right
    // edge, anchor to the button's right edge instead.
    let left = rect.left;
    if (left + width > window.innerWidth - margin) {
      left = rect.right - width;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    let top = rect.bottom + 6;
    top = Math.min(top, window.innerHeight - margin);
    setCoords({ top, left, width });
  }, []);

  const openDropdown = (e) => {
    e.stopPropagation();
    computeCoords(); // measure BEFORE state flips, not after render
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    if (!isOpen) return;
    computeCoords();
    window.addEventListener("resize", computeCoords);
    window.addEventListener("scroll", computeCoords, true);
    return () => {
      window.removeEventListener("resize", computeCoords);
      window.removeEventListener("scroll", computeCoords, true);
    };
  }, [isOpen, computeCoords]);

  const selectedOption = options.find((opt) => opt.id === value || opt.slug === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <motion.button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label ? `${label}: ${selectedOption ? selectedOption.label || selectedOption.title : placeholder}` : undefined}
        whileTap={{ scale: 0.98 }}
        onClick={openDropdown}
        className="w-full flex items-center justify-between bg-[#0a0a10]/90 glass-control hover:border-white/20 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-all outline-none shadow-inner"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={14} className="text-blue-400 shrink-0" />}
          <span className="truncate">{selectedOption ? selectedOption.label || selectedOption.title : placeholder}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div ref={menuRef} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }} style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 99999 }}
              className="glass rounded-xl overflow-hidden p-1.5">
              <div role="listbox" aria-label={label || placeholder} className="max-h-60 overflow-y-auto space-y-1 scrollbar-hide">
                {options.map((opt) => {
                  const isSelected = opt.id === value || opt.slug === value;
                  return (
                    <button key={opt.id || opt.slug} type="button" role="option" aria-selected={isSelected}
                      onClick={(e) => { e.stopPropagation(); onChange(opt.id || opt.slug); setIsOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                        isSelected ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/20" : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                      }`}>
                      <span className="truncate">{opt.label || opt.title}{opt.difficulty ? ` · level ${opt.difficulty}` : ""}</span>
                      {isSelected && <Check size={14} className="text-blue-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export function GlassPanel({ children, className = "" }) {
  return (
    <div className={`bg-[#07080f]/55 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_32px_rgba(0,0,0,0.5)] transition-colors duration-300 hover:border-white/[0.14] ${className}`}>
      {children}
    </div>
  );
}
