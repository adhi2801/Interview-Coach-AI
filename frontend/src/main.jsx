import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Monaco Editor's internal resize handling can trigger a benign but noisy
// "ResizeObserver loop completed with undelivered notifications" error in
// dev mode. It's harmless in production, but CRA's error overlay treats it
// as blocking and captures all clicks while it's showing — which is why
// dropdowns/buttons can silently stop responding. Debouncing the callback
// prevents the loop from ever firing. Gated to development only — there's
// no CRA error overlay in production to protect against, and there's no
// reason to alter ResizeObserver's real timing behavior for real users.
if (import.meta.env.DEV) {
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
    constructor(callback) {
      let timeout;
      const debounced = (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback(...args), 20);
      };
      super(debounced);
    }
  };
}

// Error reporting, only when a DSN is configured. The SDK is loaded after
// the first paint instead of in the entry bundle, so it never delays the
// page; anything thrown before it arrives is still logged to the console.
if (import.meta.env.REACT_APP_SENTRY_DSN) {
  const start = () => import('@sentry/react').then((Sentry) => Sentry.init({
    dsn: import.meta.env.REACT_APP_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Separates local testing from production in Sentry's dashboard.
    environment: import.meta.env.MODE,
  }));
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 1500);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);