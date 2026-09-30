import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Search, LayoutGrid, Code2, LogOut, Settings as SettingsIcon, Play, Database, AlertTriangle, History } from "lucide-react";
import "./App.css";
import { AUTH_EXPIRED_EVENT, clearAuth, getToken, isTokenExpired, loadSavedUser, renewTokenIfDue } from "./lib/api";
import { useTransitionNavigate } from "./lib/navigation";
import { AppChromeContext, BlueprintBackdrop } from "./components/app/AppChrome";

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
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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
    { icon: Play, label: "Start an interview", action: () => navigate("/setup") },
    { icon: Code2, label: "Solve a coding problem", action: () => navigate("/coding") },
    { icon: LayoutGrid, label: "Overview", action: () => navigate("/") },
    { icon: Database, label: "Knowledge graph", action: () => navigate("/study-plan") },
    { icon: History, label: "Sessions", action: () => navigate("/replay") },
    { icon: SettingsIcon, label: "Settings", action: () => navigate("/settings") },
    { icon: LogOut, label: "Log out", action: () => onLogout(), danger: true },
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label="Go to"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg border border-white/15 bg-[#0a0a10] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center border-b border-white/[0.08] px-4">
          <Search size={16} aria-hidden="true" className="mr-3 text-white/50" />
          <input
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCursor(0); }}
            placeholder="Go to…"
            aria-label="Search pages and actions"
            className="w-full bg-transparent py-4 text-[16px] text-white outline-none placeholder-white/40"
            spellCheck={false}
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5" role="listbox" aria-label="Pages and actions" data-lenis-prevent>
          {filteredActions.length === 0 ? (
            <p className="px-3 py-8 text-center text-[14px] text-white/55">Nothing matches “{search}”.</p>
          ) : (
            filteredActions.map((action, i) => {
              const selected = i === safeCursor;
              return (
                <button key={action.label} type="button" role="option" aria-selected={selected}
                  onMouseEnter={() => setCursor(i)} onClick={() => run(action)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] outline-none ${selected ? (action.danger ? "bg-rose-500/10 text-rose-200" : "bg-white/[0.07] text-white") : action.danger ? "text-rose-200/80" : "text-white/75"}`}>
                  <action.icon size={15} aria-hidden="true" className={action.danger ? "text-rose-300" : "text-white/50"} />
                  {action.label}
                </button>
              );
            })
          )}
        </div>
        <p className="border-t border-white/[0.06] px-4 py-2 text-[12.5px] text-white/50">↑ ↓ to move, Enter to open, Esc to close</p>
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
  const chrome = React.useMemo(() => ({ user, onLogout, openPalette: onOpenCommandPalette }), [user, onLogout, onOpenCommandPalette]);

  return (
    <AppChromeContext.Provider value={chrome}>
    <div className="w-full h-full">
      {/* One backdrop behind every signed-in page, the same blueprint field
          as the landing page: flat black, frame rails, a soft top glow. */}
      <BlueprintBackdrop />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<UserDashboard user={user} onStartNew={() => navigate("/setup")} onNavigateHistory={() => navigate("/replay")} onStartCoding={() => navigate("/coding")} onNavigateSettings={() => navigate("/settings")} onNavigateStudyPlan={() => navigate("/study-plan")} onEloUpdate={onEloUpdate} />} />
            <Route path="/setup" element={<Dashboard user={user} onLogout={onLogout} onGoBack={() => navigate("/")} onStart={(data) => { setSessionData(data); navigate("/preflight"); }} />} />
            <Route path="/preflight" element={<PreflightCheck sessionData={sessionData} onReady={() => navigate("/interview")} onSkip={() => navigate("/interview")} />} />
            <Route path="/interview" element={
              <RequireSession sessionData={sessionData}>
                <InterviewRoom sessionData={sessionData} onFinish={() => navigate(`/replay/${sessionData.session_id}`)} onEloUpdate={onEloUpdate} />
              </RequireSession>
            } />
            <Route path="/coding" element={<CodingRoom sessionId={sessionData?.session_id} user={user} onFinish={() => navigate("/")} onEloUpdate={onEloUpdate} />} />
            {/* /replay is always the list; a finished interview goes straight to its own replay. */}
            <Route path="/replay" element={<ReplayViewer onExit={() => navigate("/")} onSelectSession={(id) => navigate(`/replay/${id}`)} />} />
            <Route path="/replay/:id" element={<ReplayViewerWithParam onExit={() => navigate("/")} onBackToList={() => navigate("/replay")} />} />
            <Route path="/study-plan" element={<StudyPlanBrowser onGoBack={() => navigate("/")} />} />
            <Route path="/settings" element={<Settings user={user} onLogout={onLogout} onGoBack={() => navigate("/")} onProfileUpdate={onUserPatch} />} />
            {/* A reset link opened while already logged in still works. */}
            <Route path="/reset-password" element={<ResetPassword onAuth={() => navigate("/")} onForgotPassword={() => navigate("/settings")} onBackToHome={() => navigate("/")} />} />
            <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
            <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
    </div>
    </AppChromeContext.Provider>
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
            <Route path="/login" element={<Login onAuth={onAuth} onSwitchToSignup={() => navigate("/signup")} onForgotPassword={() => navigate("/forgot-password")} onBackToHome={() => navigate("/")} />} />
            <Route path="/forgot-password" element={<ForgotPassword onBackToLogin={() => navigate("/login")} onBackToHome={() => navigate("/")} />} />
            <Route path="/reset-password" element={<ResetPassword onAuth={onAuth} onForgotPassword={() => navigate("/forgot-password")} onBackToHome={() => navigate("/")} />} />
            <Route path="/signup" element={<Signup onAuth={onAuth} onSwitchToLogin={() => navigate("/login")} onBackToHome={() => navigate("/")} />} />
            <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
            <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
    </div>
  );
}

function ReplayViewerWithParam({ onExit, onBackToList }) {
  const { id } = useParams();
  return <ReplayViewer sessionId={parseInt(id, 10)} onExit={onExit} onBackToList={onBackToList} />;
}

function AppContent({ user, handleAuth, handleLogout, handleEloUpdate, handleUserPatch, sessionData, setSessionData }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const openPalette = React.useCallback(() => setCmdOpen(true), []);
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Ctrl/⌘+K opens the "go to" palette — the one global shortcut. Others
  // (⌘D, ⌘G, ⌘Enter, ⌘⇧X…) used to override the browser's own bookmark and
  // find-next keys; the palette reaches every page without them.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (user) setCmdOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user]);


  return (
    <>
      <div className="w-full min-h-screen relative z-10">
        {user ? (
          <AuthenticatedRoutes user={user} onLogout={handleLogout} onEloUpdate={handleEloUpdate} onUserPatch={handleUserPatch} sessionData={sessionData} setSessionData={setSessionData} onOpenCommandPalette={openPalette} />
        ) : (
          <UnauthenticatedRoutes onAuth={handleAuth} />
        )}
      </div>
      <AnimatePresence>
        {cmdOpen && <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} navigate={navigate} onLogout={handleLogout} />}
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

  // Keep the day-long login token fresh while the app is open.
  const signedIn = Boolean(user);
  useEffect(() => {
    if (!signedIn) return;
    renewTokenIfDue();
    const timer = setInterval(renewTokenIfDue, 30 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") renewTokenIfDue(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [signedIn]);

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