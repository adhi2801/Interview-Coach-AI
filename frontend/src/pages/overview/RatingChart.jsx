// Rating over time. One point per scored interview or coding submission;
// interview points are indigo, coding points emerald, so the two tracks
// that feed the one rating are told apart.

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmtDay = (t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Dot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  const fill = payload.track === "coding" ? "#34d399" : "#a5b4fc";
  return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={fill} stroke="#050507" strokeWidth={1.5} />;
}

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border border-white/15 bg-[#0b0b10] px-3 py-2 text-[12.5px] text-white shadow-xl">
      <p className="font-mono tabular-nums">{p.elo}</p>
      <p className="text-white/55">{p.track === "coding" ? "Coding" : "Interview"}, {fmtDay(p.t)}</p>
    </div>
  );
}

// Round, evenly spaced rating ticks (1,175 / 1,200 / 1,225 …) around the
// data, instead of whatever the padded min and max happened to be.
export function ratingTicks(values) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const rough = Math.max(1, (hi - lo) / 3);
  const step = [5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => s >= rough) || 1000;
  const start = Math.floor(lo / step) * step - (lo % step === 0 ? step : 0);
  const end = Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0);
  const ticks = [];
  for (let t = start; t <= end; t += step) ticks.push(t);
  return ticks;
}

export default function RatingChart({ series }) {
  const ticks = ratingTicks(series.map((p) => p.elo));
  return (
    <div className="h-[240px] w-full" role="img"
      aria-label={`Rating from ${series[0].elo} to ${series[series.length - 1].elo} over ${series.length} scored sessions`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 12, right: 12, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="rating-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={fmtDay}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "JetBrains Mono" }} tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }} minTickGap={36} />
          <YAxis domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={(v) => v.toLocaleString("en-US")} width={52}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
          <Area type="monotone" dataKey="elo" stroke="#a5b4fc" strokeWidth={1.75} fill="url(#rating-fill)"
            dot={<Dot />} activeDot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
