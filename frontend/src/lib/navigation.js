// frontend/src/lib/navigation.js
//
// Every in-app navigation goes through the browser's native View Transitions
// API (via React Router's `viewTransition` flag). The CSS in index.css
// choreographs it: the old page recedes and blurs, the new one arrives from
// depth. Browsers without the API simply navigate instantly.

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") return navigate(to);
      return navigate(to, { viewTransition: true, ...options });
    },
    [navigate]
  );
}
