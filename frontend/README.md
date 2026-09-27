# InterviewCoach AI — Frontend

React 19 + Vite single-page app. See the root README for the full project.

```bash
npm install
npm run dev      # http://localhost:3000, talks to the API on :8000
npm run lint     # ESLint (incl. React Hooks rules)
npm test         # Vitest
npm run build    # production build into build/
```

Environment (set in Vercel for production; the `REACT_APP_` prefix is kept from the CRA days):

| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8000` | REST API base URL |
| `REACT_APP_WS_URL` | `ws://localhost:8000` | Live-coaching WebSocket base URL |
| `REACT_APP_SENTRY_DSN` | unset | Error reporting |

All HTTP calls go through `src/lib/api.js`, which attaches the token, turns every failure into a readable `Error`, and logs the user out when a session expires.
