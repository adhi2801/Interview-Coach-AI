import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Search, LayoutGrid, Code2, LogOut, Settings as SettingsIcon, Play, Database, AlertTriangle } from "lucide-react";
import "./App.css";
import { AUTH_EXPIRED_EVENT, clearAuth, getToken, isTokenExpired, loadSavedUser } from "./lib/api";
import { pageTransition, spring } from "./lib/motion";
import { Spinner } from "./components/ui";

// Every route-level page is now code-split. Previously all 13 pages were
// eagerly imported at the top of this file, meaning a first-time visitor
// to Landing downloaded the entire app in one 422 kB gzipped bundle —
// including Monaco (CodingRoom) and every authenticated-only page —
// before ever seeing the hero. Each of these now becomes its own chunk,
// only fetched when the user actually navigates to that route.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const PreflightCheck = lazy(() => import("./pages/PreflightCheck"));
const InterviewRoom = lazy(() => import("./pages/InterviewRoom"));
const ReplayViewer = lazy(() => import("./pages/ReplayViewer"));
const CodingRoom = lazy(() => import("./pages/CodingRoom"));
const Settings = lazy(() => import("./pages/Settings"));
const StudyPlanBrowser = lazy(() => import("./pages/StudyPlanBrowser"));

// Lightweight fallback shown only while a route's chunk is actually being
// fetched over the network — on a warm cache or fast connection this is
// often invisible.
function RouteLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-canvas text-label-3">
      <Spinner />
    </div>
  );
}

function CommandPalette({ isOpen, onClose, navigate, onLogout }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) setSearch("");
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { icon: Play, label: "Start New Interview", shortcut: "⌘ Enter", action: () => { navigate("/setup"); onClose(); } },
    { icon: Code2, label: "Launch Coding Sandbox", shortcut: "⌘ Shift E", action: () => { navigate("/coding"); onClose(); } },
    { icon: Database, label: "View Knowledge Graph", shortcut: "⌘ G", action: () => { navigate("/study-plan"); onClose(); } },
    { icon: LayoutGrid, label: "Go to Dashboard", shortcut: "⌘ D", action: () => { navigate("/"); onClose(); } },
    { icon: SettingsIcon, label: "Account Settings", shortcut: "⌘ ,", action: () => { navigate("/settings"); onClose(); } },
    { icon: LogOut, label: "Log Out", shortcut: "⌘ ⇧ X", action: () => { onLogout(); onClose(); }, danger: true },
  ];

  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -4 }}
        transition={spring.gentle}
        className="relative mx-4 flex w-full max-w-xl flex-col overflow-hidden rounded-panel border border-hairline bg-surface/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      >
        <div className="flex items-center border-b border-hairline px-4">
          <Search size={17} className="mr-3 text-label-3" aria-hidden="true" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions"
            aria-label="Search actions"
            className="w-full bg-transparent py-4 text-body text-label outline-none placeholder:text-label-3"
            spellCheck={false}
          />
          <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 text-caption text-label-3">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-callout text-label-3">No actions match "{search}".</div>
          ) : (
            filteredActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                className="group flex w-full items-center justify-between rounded-control px-3 py-2.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <action.icon size={17} className={action.danger ? "text-critical" : "text-label-2"} aria-hidden="true" />
                  <span className={`text-callout ${action.danger ? "text-critical" : "text-label"}`}>{action.label}</span>
                </div>
                {action.shortcut && (
                  <span className="text-footnote text-label-3">{action.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function RequireSession({ sessionData, redirectTo = "/", children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!sessionData?.session_id) {
      navigate(redirectTo, { replace: true });
    }
  }, [sessionData, navigate, redirectTo]);

  if (!sessionData?.session_id) return null;
  return children;
}

function AuthenticatedRoutes({ user, onLogout, onEloUpdate, onUserPatch, sessionData, setSessionData, onOpenCommandPalette }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition} className="w-full h-full">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<UserDashboard user={user} onLogout={onLogout} onStartNew={() => navigate("/setup")} onNavigateHistory={() => navigate("/replay")} onStartCoding={() => navigate("/coding")} onNavigateSettings={() => navigate("/settings")} onNavigateStudyPlan={() => navigate("/study-plan")} onOpenCommandPalette={onOpenCommandPalette} onEloUpdate={onEloUpdate} />} />
            <Route path="/setup" element={<Dashboard user={user} onLogout={onLogout} onGoBack={() => navigate("/")} onStart={(data) => { setSessionData(data); navigate("/preflight"); }} />} />
            <Route path="/preflight" element={<PreflightCheck sessionData={sessionData} onReady={() => navigate("/interview")} onSkip={() => navigate("/interview")} />} />
            <Route path="/interview" element={
              <RequireSession sessionData={sessionData}>
                <InterviewRoom sessionData={sessionData} onFinish={() => navigate("/replay")} onEloUpdate={onEloUpdate} />
              </RequireSession>
            } />
            <Route path="/coding" element={<CodingRoom sessionId={sessionData?.session_id} user={user} onFinish={() => navigate("/")} onEloUpdate={onEloUpdate} />} />
            <Route path="/replay" element={<ReplayViewer sessionId={sessionData?.session_id} onExit={() => navigate("/")} onSelectSession={(id) => navigate(`/replay/${id}`)} />} />
            <Route path="/replay/:id" element={<ReplayViewerWithParam onExit={() => navigate("/")} />} />
            <Route path="/study-plan" element={<StudyPlanBrowser onGoBack={() => navigate("/")} />} />
            <Route path="/settings" element={<Settings user={user} onLogout={onLogout} onGoBack={() => navigate("/")} onProfileUpdate={onUserPatch} />} />
            <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
            <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />  
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function UnauthenticatedRoutes({ onAuth }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition} className="w-full h-full">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={
              <Landing 
                onGetStarted={() => navigate("/signup")} 
                onSignIn={() => navigate("/login")} 
                onNavigatePrivacy={() => navigate("/privacy")}
                onNavigateTerms={() => navigate("/terms")}
              />
            } />
            <Route path="/login" element={<Login onAuth={onAuth} onSwitchToSignup={() => navigate("/signup")} onBackToHome={() => navigate("/")} />} />
            <Route path="/signup" element={<Signup onAuth={onAuth} onSwitchToLogin={() => navigate("/login")} onBackToHome={() => navigate("/")} onNavigatePrivacy={() => navigate("/privacy")} onNavigateTerms={() => navigate("/terms")} />} />
            <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
            <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function ReplayViewerWithParam({ onExit }) {
  const { id } = useParams();
  return <ReplayViewer sessionId={parseInt(id, 10)} onExit={onExit} />;
}

function AppContent({ user, handleAuth, handleLogout, handleEloUpdate, handleUserPatch, sessionData, setSessionData }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [logoutConfirming, setLogoutConfirming] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logoutConfirmTimerRef = React.useRef(null);

  useEffect(() => {
    // Global shortcuts are suppressed entirely while inside an active
    // interview or coding session — a stray ⌘D (bookmark muscle memory)
    // or ⌘Enter shouldn't be able to yank someone out of an in-progress
    // answer with zero warning. InterviewRoom already has a deliberate,
    // confirmed Abort flow for leaving mid-session; global shortcuts
    // must not bypass it.
    const inActiveSession = location.pathname.startsWith("/interview") || location.pathname.startsWith("/coding");

    const handleKeyDown = (e) => {
      const isTypingTarget = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K — open/close command palette. Always available, even mid-session,
      // since it's a non-destructive overlay, not a navigation away from work.
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (user) setCmdOpen((open) => !open);
        return;
      }

      if (!user || inActiveSession || isTypingTarget) return;

      // ⌘Enter — Start New Interview
      if (mod && e.key === "Enter") {
        e.preventDefault();
        navigate("/setup");
        return;
      }
      // ⌘⇧E — Launch Coding Sandbox (not ⌘⇧C — that's the browser's
      // built-in "Inspect Element" shortcut in Chrome/Firefox)
      if (mod && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        navigate("/coding");
        return;
      }
      // ⌘G — View Knowledge Graph
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        navigate("/study-plan");
        return;
      }
      // ⌘D — Go to Dashboard
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        navigate("/");
        return;
      }
      // ⌘, — Account Settings
      if (mod && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
        return;
      }
      // ⌘⇧X — Log Out (not ⌘Q — that's the OS-level "Quit Browser"
      // shortcut on Mac, and would close the whole browser, not log out).
      // Requires pressing it twice within 2.5s — a stray hit shouldn't
      // instantly end the session with no way back.
      if (mod && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        if (logoutConfirming) {
          clearTimeout(logoutConfirmTimerRef.current);
          setLogoutConfirming(false);
          handleLogout();
        } else {
          setLogoutConfirming(true);
          logoutConfirmTimerRef.current = setTimeout(() => setLogoutConfirming(false), 2500);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user, location.pathname, logoutConfirming, navigate, handleLogout]);

  useEffect(() => () => clearTimeout(logoutConfirmTimerRef.current), []);

  return (
    <>
      <div className="w-full min-h-screen relative z-10">
        {user ? (
          <AuthenticatedRoutes user={user} onLogout={handleLogout} onEloUpdate={handleEloUpdate} onUserPatch={handleUserPatch} sessionData={sessionData} setSessionData={setSessionData} onOpenCommandPalette={() => setCmdOpen(true)} />
        ) : (
          <UnauthenticatedRoutes onAuth={handleAuth} />
        )}
      </div>
      <AnimatePresence>
        {cmdOpen && <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} navigate={navigate} onLogout={handleLogout} />}
      </AnimatePresence>
      <AnimatePresence>
        {logoutConfirming && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 bg-[#0A0A0C]/95 backdrop-blur-2xl border border-rose-500/25 rounded-xl px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            <AlertTriangle size={15} className="text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">
              Press <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded mx-1 text-rose-300">⌘⇧X</kbd> again to log out
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// The active interview session lives in sessionStorage (per-tab, cleared
// when the tab closes). Previously it was React state only, so a refresh
// mid-interview bounced the candidate to the dashboard and orphaned the
// session they were in the middle of.
const SESSION_KEY = "ic_active_session";

function loadActiveSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistActiveSession(data) {
  try {
    if (data) sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — session just won't survive a refresh */
  }
}

// Resolved synchronously on first render: a valid, unexpired token restores
// the user immediately; anything else is cleared. This replaces a fixed
// 400ms artificial delay that every page load used to sit through.
function restoreUser() {
  const token = getToken();
  const saved = loadSavedUser();
  if (saved && token && !isTokenExpired(token)) return saved;
  clearAuth();
  return null;
}

function App() {
  const [user, setUser] = useState(restoreUser);
  const [sessionData, setSessionDataState] = useState(loadActiveSession);
  const [sessionExpired, setSessionExpired] = useState(false);

  const setSessionData = React.useCallback((data) => {
    persistActiveSession(data);
    setSessionDataState(data);
  }, []);

  const handleLogout = React.useCallback(() => {
    clearAuth();
    persistActiveSession(null);
    setSessionDataState(null);
    setUser(null);
  }, []);

  // lib/api fires this on any 401 for a request that carried a token.
  useEffect(() => {
    const onExpired = () => {
      setSessionExpired(true);
      handleLogout();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [handleLogout]);

  // Logging in or out in another tab is reflected here too.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== "access_token") return;
      if (!e.newValue) handleLogout();
      else setUser(restoreUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [handleLogout]);

  function handleAuth(userData) {
    setSessionExpired(false);
    setUser(userData);
  }

  function handleUserPatch(patch) {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updated = { ...prevUser, ...patch };
      try { localStorage.setItem("user", JSON.stringify(updated)); } catch { /* non-fatal */ }
      return updated;
    });
  }

  function handleEloUpdate(newElo) {
    handleUserPatch({ elo_rating: newElo });
  }

  return (
    <div className="relative min-h-screen w-full bg-canvas font-sans text-label">
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppContent
          user={user}
          handleAuth={handleAuth}
          handleLogout={handleLogout}
          handleEloUpdate={handleEloUpdate}
          handleUserPatch={handleUserPatch}
          sessionData={sessionData}
          setSessionData={setSessionData}
        />
      </BrowserRouter>
      <AnimatePresence>
        {sessionExpired && !user && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-full border border-hairline bg-surface/95 py-2.5 pl-4 pr-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <AlertTriangle size={15} className="shrink-0 text-caution" aria-hidden="true" />
            <span className="text-footnote text-label">Your session expired. Log in again to continue.</span>
            <button
              onClick={() => setSessionExpired(false)}
              className="rounded-full px-3 py-1 text-footnote text-label-2 transition-colors hover:bg-surface-2 hover:text-label"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

export default App;