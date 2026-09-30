// Languages, difficulty tiers and small formatters for the coding room.

export const LANGUAGES = [
  { id: "python", label: "Python 3.11", monaco: "python", ext: "py" },
  { id: "javascript", label: "JavaScript ES6", monaco: "javascript", ext: "js" },
  { id: "cpp", label: "C++ 20", monaco: "cpp", ext: "cpp" },
  { id: "java", label: "Java 17", monaco: "java", ext: "java" },
];

// Difficulty tiering from the problem's difficulty (1-10). Drives the
// ambient glow and the colour of the difficulty label.
export const DIFF_TOKENS = {
  easy:   { label: "Easy",   hue: "#34d399", glowA: "rgba(16,185,129,.16)", glowB: "rgba(16,185,129,.09)" },
  medium: { label: "Medium", hue: "#fbbf24", glowA: "rgba(245,158,11,.17)", glowB: "rgba(245,158,11,.09)" },
  hard:   { label: "Hard",   hue: "#fb7185", glowA: "rgba(244,63,94,.18)",  glowB: "rgba(244,63,94,.10)" },
};
export function diffTier(difficulty) {
  if (!difficulty) return DIFF_TOKENS.medium;
  if (difficulty <= 3) return DIFF_TOKENS.easy;
  if (difficulty <= 6) return DIFF_TOKENS.medium;
  return DIFF_TOKENS.hard;
}

// m:ss since the current problem was loaded.
export function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// The modifier key as this platform labels it, for shortcut hints.
export const MOD_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

// Extracts a line number from a stderr/traceback string.
// Covers Python ("line 12"), and generic compiler-style "file:12:" formats
// used by JS/Java/C++. Returns null (not a guess) if nothing matches —
// the UI only offers "Go to line" when this genuinely finds one.
export function parseErrorLine(stderr) {
  if (!stderr) return null;
  const pyMatch = stderr.match(/line (\d+)/i);
  if (pyMatch) return parseInt(pyMatch[1], 10);
  const genericMatch = stderr.match(/:(\d+):\d*/);
  if (genericMatch) return parseInt(genericMatch[1], 10);
  return null;
}
