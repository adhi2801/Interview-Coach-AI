// Per-problem, per-language code drafts in localStorage, plus the problem the
// candidate was last working on. Switching language or reloading the page
// no longer throws work away. Storage can be unavailable (private mode,
// blocked site data), so every access is wrapped and failure is harmless.

const DRAFT_PREFIX = "ic_draft:";
const CURRENT_PROBLEM = "ic_coding_problem";

const key = (slug, language) => `${DRAFT_PREFIX}${slug}:${language}`;

export function loadDraft(slug, language) {
  try {
    return localStorage.getItem(key(slug, language));
  } catch {
    return null;
  }
}

/** Stores the draft; an untouched starter (or empty editor) clears it. */
export function saveDraft(slug, language, code, starter) {
  try {
    if (!code || code === starter) localStorage.removeItem(key(slug, language));
    else localStorage.setItem(key(slug, language), code);
  } catch {
    /* storage unavailable — the in-memory editor still has the code */
  }
}

export function codeFor(problem, language) {
  const starter = problem?.starter_code?.[language] || "";
  return (problem?.slug && loadDraft(problem.slug, language)) ?? starter;
}

export function rememberProblem(slug) {
  try {
    localStorage.setItem(CURRENT_PROBLEM, slug);
  } catch {
    /* ignore */
  }
}

export function recallProblem() {
  try {
    return localStorage.getItem(CURRENT_PROBLEM);
  } catch {
    return null;
  }
}
