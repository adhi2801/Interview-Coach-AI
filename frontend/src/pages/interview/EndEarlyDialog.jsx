// Confirmation before leaving an interview mid-question.
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

export default function EndEarlyDialog({ open, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-200 bg-black/70 backdrop-blur-md flex items-center justify-center">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          role="alertdialog" aria-modal="true" aria-labelledby="abort-title" aria-describedby="abort-desc"
          className="glass rounded-2xl p-8 max-w-[360px] w-[calc(100%-40px)] text-center shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <h3 id="abort-title" className="text-base font-semibold text-white mb-2">End the interview now?</h3>
          <p id="abort-desc" className="text-[13px] text-slate-400 leading-relaxed mb-5">The answer you're writing is discarded. Answers you already submitted stay scored.</p>
          <button onClick={onConfirm} className="w-full py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-400 font-bold text-xs hover:bg-rose-500/25 transition-colors">
            End interview
          </button>
          <button autoFocus onClick={onCancel} className="w-full py-2.5 rounded-lg bg-white/5 glass-control text-slate-400 font-semibold text-xs mt-2 hover:bg-white/10 transition-colors">
            Keep going
          </button>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
