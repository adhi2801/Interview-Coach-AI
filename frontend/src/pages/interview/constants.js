// Pure lookups and formatting for the interview room.
import { Coffee, Flame, Search, UserCheck } from "lucide-react";

export const TOTAL_NODES = 5;

// Maps raw backend category codes to clean, human-readable labels
export const CATEGORY_LABELS = {
  algorithms: "Algorithms",
  data_structures: "Data Structures",
  system_design: "System Design",
  distributed_systems: "Distributed Systems",
  databases: "Databases",
  behavioral: "Behavioral",
  leadership: "Leadership",
  communication: "Communication",
  machine_learning: "Machine Learning",
  concurrency: "Concurrency",
  security: "Security",
  networking: "Networking",
  oop: "OOP Design",
  binary_search: "Algorithms",
};

export function formatCategory(category) {
  if (!category) return "Technical";
  return CATEGORY_LABELS[category] || category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Persona-reactive visual identity. Drives accent color, ambient glow,
// evaluator copy, and framing language across the answering phase.
// Persona is set once per session (chosen in interview setup) — this is not
// a live switcher, just a styling lookup keyed off sessionData.persona.
export const PERSONA_META = {
  standard: {
    label: "Standard",
    name: "Standard Evaluator",
    quote: "I'm listening. Walk me through it.",
    moodDesc: "Balanced — receptive to evidence",
    icon: UserCheck,
    accentRgb: "16,185,129",
    accentHex: "#10b981",
    askLabel: "The ask",
  },
  hostile: {
    label: "Hostile",
    name: "Hostile Interrogator",
    quote: "That answer won't hold. Defend it.",
    moodDesc: "Aggressive — challenges everything",
    icon: Flame,
    accentRgb: "239,68,68",
    accentHex: "#ef4444",
    askLabel: "Defend this",
  },
  socratic: {
    label: "Socratic",
    name: "Socratic Prober",
    quote: "Interesting. But why that approach specifically?",
    moodDesc: "First-principles — questions back",
    icon: Search,
    accentRgb: "99,102,241",
    accentHex: "#818cf8",
    askLabel: "The deeper question",
  },
  exhausted: {
    label: "Exhausted",
    name: "Exhausted Interviewer",
    quote: "Just give me the one-sentence version.",
    moodDesc: "Low energy — wants tight clarity",
    icon: Coffee,
    accentRgb: "245,158,11",
    accentHex: "#f59e0b",
    askLabel: "Be concise",
  },
};

export function getPersonaMeta(persona) {
  return PERSONA_META[persona?.toLowerCase()] || PERSONA_META.standard;
}

// Base 90s + ~9s per 100 characters of context, plus 15s per constraint —
// a longer/denser question genuinely needs more reading+thinking time.
// Floor 90s, cap 240s so it never runs away on an unusually long scenario.
// Seconds to answer one question, by its kind, as a real loop paces them:
// a system design answer gets the time to clarify, sketch and weigh
// trade-offs; a behavioural story, a few minutes. Longer scenarios and more
// constraints add reading time. (It was 90-240 s for every question, which
// cut system design answers off mid-thought when the timer auto-submits.)
const BASE_SECONDS = { system_design: 12 * 60, behavioral: 5 * 60, default: 8 * 60 };

export function computeTimeLimit(scenarioText, constraintList, category = "") {
  const kind = /system|design|architect/i.test(category) ? "system_design"
    : /behav|leadership|culture/i.test(category) ? "behavioral" : "default";
  const reading = Math.round((scenarioText?.length || 0) / 100) * 10 + (constraintList?.length || 0) * 20;
  return BASE_SECONDS[kind] + Math.min(reading, 3 * 60);
}

export function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
