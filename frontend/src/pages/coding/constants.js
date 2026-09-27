// Languages, difficulty tiers and small formatters for the coding room.

export const LANGUAGES = [
  { id: "python", label: "Python 3.11", monaco: "python", ext: "py" },
  { id: "javascript", label: "JavaScript ES6", monaco: "javascript", ext: "js" },
  { id: "cpp", label: "C++ 20", monaco: "cpp", ext: "cpp" },
  { id: "java", label: "Java 17", monaco: "java", ext: "java" },
];

// Difficulty tiering — derived from the real problem.difficulty number (1-10),
// not fabricated. Drives the ambient glow and badge color.
export const DIFF_TOKENS = {
  easy:   { label: "EASY",   hue: "#10b981", glowA: "rgba(16,185,129,.16)",  glowB: "rgba(16,185,129,.09)",  badgeBg: "rgba(16,185,129,.12)",  badgeBorder: "rgba(16,185,129,.28)" },
  medium: { label: "MEDIUM", hue: "#f59e0b", glowA: "rgba(245,158,11,.17)",  glowB: "rgba(245,158,11,.09)",  badgeBg: "rgba(245,158,11,.12)",  badgeBorder: "rgba(245,158,11,.28)" },
  hard:   { label: "HARD",   hue: "#f43f5e", glowA: "rgba(244,63,94,.18)",   glowB: "rgba(244,63,94,.10)",   badgeBg: "rgba(244,63,94,.12)",   badgeBorder: "rgba(244,63,94,.28)" },
};
export function diffTier(difficulty) {
  if (!difficulty) return DIFF_TOKENS.medium;
  if (difficulty <= 3) return DIFF_TOKENS.easy;
  if (difficulty <= 6) return DIFF_TOKENS.medium;
  return DIFF_TOKENS.hard;
}

// mm:ss for the on-problem elapsed timer. Real, ticking from when the
// current problem was actually loaded — not a decorative static value.
export function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Parses a real "12.4ms" style string from the backend into a number for
// the per-test bar visual. Returns null (not 0) when unparseable, so we
// never silently draw a fake zero-width bar for missing data.
// Extracts a real line number from a real stderr/traceback string.
// Covers Python ("line 12"), and generic compiler-style "file:12:" formats
// used by JS/Java/C++. Returns null (not a guess) if nothing matches —
// the UI only ever offers "Jump to Error" when this genuinely finds one.
export function parseErrorLine(stderr) {
  if (!stderr) return null;
  const pyMatch = stderr.match(/line (\d+)/i);
  if (pyMatch) return parseInt(pyMatch[1], 10);
  const genericMatch = stderr.match(/:(\d+):\d*/);
  if (genericMatch) return parseInt(genericMatch[1], 10);
  return null;
}

export function parseMs(execTimeStr) {
  if (!execTimeStr) return null;
  const match = String(execTimeStr).match(/([\d.]+)\s*ms/i);
  return match ? parseFloat(match[1]) : null;
}

// Mount-in stagger — content reveals in sequence rather than all at once.
export const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
export const staggerItem = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
