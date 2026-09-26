// frontend/src/pages/landing/liveCounts.js
//
// The coding-problem count shown on the landing page comes from the live
// API (the public /coding/problems list), so it can never drift from what a
// signed-in user actually gets. One request per page load, shared by every
// component; until it answers (or if the free-tier backend is asleep) the
// last count confirmed against production is shown.

import { useEffect, useState } from "react";
import api from "../../lib/api";

export const PROBLEMS_FALLBACK = 25;

let pending = null;
let known = null;

function fetchCount() {
  if (!pending) {
    pending = api
      .get("/coding/problems", { timeout: 12000 })
      .then(({ data }) => {
        const n = Array.isArray(data?.problems) ? data.problems.length : 0;
        known = n > 0 ? n : null;
        return known;
      })
      .catch(() => null);
  }
  return pending;
}

export function useProblemCount() {
  const [n, setN] = useState(known ?? PROBLEMS_FALLBACK);
  useEffect(() => {
    let alive = true;
    fetchCount().then((v) => {
      if (alive && v) setN(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return n;
}
