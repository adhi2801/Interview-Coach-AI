import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Search, LayoutGrid, Code2, LogOut, Settings as SettingsIcon, Play, Database, AlertTriangle } from "lucide-react";
import "./App.css";
import { AUTH_EXPIRED_EVENT, clearAuth, getToken, isTokenExpired, loadSavedUser } from "./lib/api";
import { useTransitionNavigate } from "./lib/navigation";
import SmoothScroll, { getLenis } from "./components/fx/SmoothScroll";
import { LiquidGlass } from "./components/fx/LiquidGlass";
import Aurora from "./components/fx/Aurora";

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
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.92, 1, 0.92] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="w-10 h-10 rounded-full bg-[radial-gradient(circle_at_35%_30%,#c7d2fe,#6366f1_45%,#1e1b4b_80%)] shadow-[0_0_40px_rgba(99,102,241,0.6)]"
      />
    </div>
  );
}

function CommandPalette({ isOpen, onClose, navigate, onLogout }) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (isOpen) { setSearch(""); setCursor(0); }
  }, [isOpen]);

  const actions = [
    { icon: Play, label: "Start New Interview", shortcut: "⌘ Enter", action: () => navigate("/setup") },
    { icon: Code2, label: "Launch Coding Sandbox", shortcut: "⌘ ⇧ E", action: () => navigate("/coding") },
    { icon: Database, label: "View Knowledge Graph", shortcut: "⌘ G", action: () => navigate("/study-plan") },
    { icon: LayoutGrid, label: "Go to Dashboard", shortcut: "⌘ D", action: () => navigate("/") },
    { icon: SettingsIcon, label: "Account Settings", shortcut: "⌘ ,", action: () => navigate("/settings") },
    { icon: LogOut, label: "Log Out", shortcut: "⌘ ⇧ X", action: () => onLogout(), danger: true },
  ];
  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));
  const safeCursor = Math.min(cursor, Math.max(0, filteredActions.length - 1));

  function run(action) {
    onClose();
    action.action();
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % Math.max(1, filteredActions.length)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c - 1 + filteredActions.length) % Math.max(1, filteredActions.length)); }
      else if (e.key === "Enter" && filteredActions[safeCursor]) { e.preventDefault(); run(filteredActions[safeCursor]); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-start justify-center pt-[14vh] px-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -24, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.96, y: -12, filter: "blur(8px)" }}
        transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
        className="relative w-full max-w-2xl"
      >
        <LiquidGlass
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          backdrop
          refract
          tone="dark"
          radius={22}
          frost={28}
          className="overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),0_0_80px_-30px_rgba(99,102,241,0.5)]"
          contentClassName="relative z-10 flex flex-col"
        >
          <div className="flex items-center px-5 border-b border-white/[0.08]">
            <Search size={18} className="text-indigo-300 mr-3" />
            <input
              autoFocus
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCursor(0); }}
              placeholder="Type a command or search..."
              aria-label="Search commands"
              className="w-full bg-transparent text-white text-lg py-5 outline-none placeholder-slate-500 font-medium focus:shadow-none"
              spellCheck={false}
            />
            <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 border border-white/10">ESC</kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide" role="listbox" data-lenis-prevent>
            {filteredActions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500 font-medium">No commands match “{search}”.</div>
            ) : (
              filteredActions.map((action, i) => {
                const selected = i === safeCursor;
                return (
                  <button
                    key={action.label}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => run(action)}
                    className="relative w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left outline-none group"
                  >
                    {selected && (
                      <motion.span
                        layoutId="palette-highlight"
                        transition={{ type: "spring", stiffness: 520, damping: 38 }}
                        className={`absolute inset-0 rounded-xl border ${action.danger ? "bg-rose-500/10 border-rose-500/25" : "bg-white/[0.07] border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"}`}
                      />
                    )}
                    <div className="relative flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${action.danger ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : selected ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-200" : "bg-white/[0.03] border-white/[0.08] text-slate-400"}`}>
                        <action.icon size={16} />
                      </div>
                      <span className={`text-sm font-semibold transition-colors ${action.danger ? "text-rose-400" : selected ? "text-white" : "text-slate-300"}`}>{action.label}</span>
                    </div>
                    {action.shortcut && (
                      <span className="relative font-mono text-[10px] text-slate-500 tracking-widest">{action.shortcut}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-4 px-5 py-2.5 border-t border-white/[0.06] text-[10px] font-mono text-slate-500">
            <span><kbd className="text-slate-300">↑↓</kbd> navigate</span>
            <span><kbd className="text-slate-300">↵</kbd> open</span>
            <span><kbd className="text-slate-300">esc</kbd> close</span>
          </div>
        </LiquidGlass>
      </motion.div>
    </div>
  );
}

function RequireSession({ sessionData, redirectTo = "/", children }) {
  const navigate = useTransitionNavigate();
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
  const navigate = useTransitionNavigate();

  return (
    <div className="w-full h-full">
      {/* One backdrop behind every signed-in page; pages are transparent over it.
          Held still (many app panels blur what's behind them) and dimmer on the
          interview/coding work surfaces so focus stays on the task. */}
      <Aurora still intensity={/^\/(interview|coding)/.test(location.pathname) ? 0.35 : 0.9} />
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
    </div>
  );
}

function UnauthenticatedRoutes({ onAuth }) {
  const location = useLocation();
  const navigate = useTransitionNavigate();

  return (
    <div className="w-full h-full">
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
            <Route path="/signup" element={<Signup onAuth={onAuth} onSwitchToLogin={() => navigate("/login")} onBackToHome={() => navigate("/")} />} />
            <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
            <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
    </div>
  );
}

function ReplayViewerWithParam({ onExit }) {
  const { id } = useParams();
  return <ReplayViewer sessionId={parseInt(id, 10)} onExit={onExit} />;
}

function AppContent({ user, handleAuth, handleLogout, handleEloUpdate, handleUserPatch, sessionData, setSessionData }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [logoutConfirming, setLogoutConfirming] = useState(false);
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const logoutConfirmTimerRef = React.useRef(null);
  // Work surfaces (interview, coding, preflight) are fixed-height apps with
  // their own scroll panes — native scrolling only there.
  const smoothScroll = !/^\/(interview|coding|preflight)/.test(location.pathname);
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [location.pathname]);

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
      <SmoothScroll enabled={smoothScroll} />
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-2.5 bg-[#0A0A0C]/95 backdrop-blur-2xl border border-rose-500/25 rounded-xl px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
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
    <div className="min-h-screen w-full bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 relative">
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
      </MotionConfig>
      <AnimatePresence>
        {sessionExpired && !user && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-3 bg-[#0A0A0C]/95 backdrop-blur-2xl border border-amber-500/25 rounded-xl px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">Your session expired. Please log in again.</span>
            <button
              onClick={() => setSessionExpired(false)}
              className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;