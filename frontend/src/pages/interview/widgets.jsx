// Small presentational pieces shared by the interview room's panes.
import { useEffect, useState } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";

// --- ANIMATED NUMBER TICKER ---
export function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

export function DimCard({ label, subtitle, value, feedback, colorFrom, colorTo, badgeBg, badgeBorder, badgeColor }) {
  const pct = Math.max(4, Math.min(100, Math.round((value || 0) * 10)));
  return (
    <div className="bg-[#0a0a10]/90 border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[13px] font-bold text-slate-200">{label}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
        </div>
        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold tabular-nums" style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }}>
          {value ? value.toFixed(1) : "—"}
        </span>
      </div>
      <div className="h-[5px] w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})` }} />
      </div>
      {feedback && (
        <p className="text-[11px] text-slate-400 leading-relaxed mt-3 pt-3 border-t border-white/[0.05]">{feedback}</p>
      )}
    </div>
  );
}

export function VoiceStat({ label, value, color }) {
  return (
    <div className="text-center px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] min-w-[80px]">
      <div className="text-2xl font-extrabold font-mono tracking-tight tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[9px] text-slate-500 font-mono mt-0.5 tracking-widest">{label.toUpperCase()}</div>
    </div>
  );
}

export function NextActionCard({ icon: Icon, color, bg, border, title, body, cta, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-[#0a0a10]/90 border border-white/[0.08] hover:border-white/20 rounded-2xl p-5 transition-all hover:-translate-y-0.5"
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3 border" style={{ background: bg, borderColor: border }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="text-[13.5px] font-bold text-slate-200 mb-1">{title}</div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{body}</p>
      <span className="text-xs font-mono font-bold" style={{ color }}>{cta} →</span>
    </button>
  );
}
