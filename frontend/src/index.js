import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Monaco Editor's internal resize handling can trigger a benign but noisy
// "ResizeObserver loop completed with undelivered notifications" error in
// dev mode. It's harmless in production, but CRA's error overlay treats it
// as blocking and captures all clicks while it's showing — which is why
// dropdowns/buttons can silently stop responding. Debouncing the callback
// prevents the loop from ever firing.
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

// Initialize Sentry only if DSN is set in .env
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);