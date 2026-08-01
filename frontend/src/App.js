import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Terminal, LayoutGrid, Code2, LogOut, Settings as SettingsIcon, Play, Database } from "lucide-react";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Landing from "./pages/Landing";
import { ThemeProvider, ThemeToggle } from "./context/ThemeContext";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import PreflightCheck from "./pages/PreflightCheck";
import InterviewRoom from "./pages/InterviewRoom";
import ReplayViewer from "./pages/ReplayViewer";
import CodingRoom from "./pages/CodingRoom";
import Settings from "./pages/Settings";
import StudyPlanBrowser from "./pages/StudyPlanBrowser";

import "./components/ui/Button.css";
import "./components/ui/Card.css";
import "./components/ui/Input.css";
import "./components/ui/Select.css";
import "./components/ui/Modal.css";
import "./components/ui/Toast.css";
import "./styles/Tokens.css";
import "./styles/Glass.css";
import "./styles/Noise.css";
import "./App.css";
import "./styles/Theme.css";

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
    { icon: Code2, label: "Launch Coding Sandbox", shortcut: "⌘ Shift C", action: () => { navigate("/coding"); onClose(); } },
    { icon: Database, label: "View Knowledge Graph", shortcut: "⌘ K", action: () => { navigate("/study-plan"); onClose(); } },
    { icon: LayoutGrid, label: "Go to Dashboard", shortcut: "⌘ D", action: () => { navigate("/"); onClose(); } },
    { icon: SettingsIcon, label: "Account Settings", shortcut: "⌘ ,", action: () => { navigate("/settings"); onClose(); } },
    { icon: LogOut, label: "Log Out", shortcut: "⌘ Q", action: () => { onLogout(); onClose(); }, danger: true },
  ];

  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-2xl bg-[#0A0A0C]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 border-b border-white/[0.08]">
          <Search size={18} className="text-slate-400 mr-3" />
          <input 
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-slate-200 text-lg py-5 outline-none placeholder-slate-500 font-medium"
            spellCheck={false}
          />
          <div className="flex items-center gap-1">
            <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 border border-white/5">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500 font-medium">No commands found.</div>
          ) : (
            filteredActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-colors outline-none focus:bg-white/[0.06] hover:bg-white/[0.04] group ${action.danger ? 'hover:bg-rose-500/10 focus:bg-rose-500/10' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${action.danger ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:bg-rose-500/20' : 'bg-white/[0.03] border-white/[0.08] text-slate-400 group-hover:text-white group-focus:text-white'}`}>
                    <action.icon size={16} />
                  </div>
                  <span className={`text-sm font-semibold transition-colors ${action.danger ? 'text-rose-400' : 'text-slate-300 group-hover:text-white group-focus:text-white'}`}>{action.label}</span>
                </div>
                {action.shortcut && (
                  <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">{action.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AuthBootloader() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const sequence = [
      "> Initializing WebRTC Context...",
      "> Establishing secure socket...",
      "> Verifying JWT Token Signature...",
      "> Restoring ELO State...",
      "> System Ready [16ms]"
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        const item = sequence[i];
        setLogs(prev => [...prev, item]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full bg-[#000000] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center z-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center font-extrabold text-black text-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-8 relative">
          IC
          <div className="absolute inset-0 rounded-2xl border border-white/50 animate-ping" />
        </div>
        
        <div className="w-80 h-32 flex flex-col items-start font-mono text-[11px] text-slate-500 space-y-2">
          {logs.map((log, index) => (
            <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              {log && log.includes("Ready") ? <span className="text-emerald-400 font-bold">{log}</span> : log}
            </motion.div>
          ))}
          <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-3 bg-slate-500 mt-1" />
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

function AuthenticatedRoutes({ user, onLogout, onEloUpdate, sessionData, setSessionData }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname}
        initial={{ opacity: 0, y: 12, scale: 0.99 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: -12, scale: 0.99 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.9 }}
        className="w-full h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<UserDashboard user={user} onLogout={onLogout} onStartNew={() => navigate("/setup")} onNavigateHistory={() => navigate("/replay")} onStartCoding={() => navigate("/coding")} onNavigateSettings={() => navigate("/settings")} onNavigateStudyPlan={() => navigate("/study-plan")} />} />
          <Route path="/setup" element={<Dashboard user={user} onLogout={onLogout} onGoBack={() => navigate("/")} onStart={(data) => { setSessionData(data); navigate("/preflight"); }} />} />
          <Route path="/preflight" element={<PreflightCheck onReady={() => navigate("/interview")} onSkip={() => navigate("/interview")} />} />
          <Route path="/interview" element={
            <RequireSession sessionData={sessionData}>
              <InterviewRoom sessionData={sessionData} onFinish={() => navigate("/replay")} onEloUpdate={onEloUpdate} />
            </RequireSession>
          } />
          <Route path="/coding" element={<CodingRoom sessionId={sessionData?.session_id} onFinish={() => navigate("/")} />} />
          <Route path="/replay" element={<ReplayViewer sessionId={sessionData?.session_id} onExit={() => navigate("/")} onSelectSession={(id) => navigate(`/replay/${id}`)} />} />
          <Route path="/replay/:id" element={<ReplayViewerWithParam onExit={() => navigate("/")} />} />
          <Route path="/study-plan" element={<StudyPlanBrowser onGoBack={() => navigate("/")} />} />
          <Route path="/settings" element={<Settings user={user} onLogout={onLogout} onGoBack={() => navigate("/")} />} />
          <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
          <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />  
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function UnauthenticatedRoutes({ onAuth }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Landing onGetStarted={() => navigate("/signup")} onSignIn={() => navigate("/login")} />} />
          <Route path="/login" element={<Login onAuth={onAuth} onSwitchToSignup={() => navigate("/signup")} onBackToHome={() => navigate("/")} />} />
          <Route path="/signup" element={<Signup onAuth={onAuth} onSwitchToLogin={() => navigate("/login")} onBackToHome={() => navigate("/")} />} />
          <Route path="/privacy" element={<PrivacyPolicy onGoBack={() => navigate("/")} />} />
          <Route path="/terms" element={<TermsOfService onGoBack={() => navigate("/")} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function ReplayViewerWithParam({ onExit }) {
  const { id } = useParams();
  return <ReplayViewer sessionId={parseInt(id, 10)} onExit={onExit} />;
}

function AppContent({ user, checkingAuth, handleAuth, handleLogout, handleEloUpdate, sessionData, setSessionData }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (user) setCmdOpen(open => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user]);

  if (checkingAuth) {
    return <AuthBootloader />;
  }

  return (
    <>
      <div className="w-full min-h-screen relative z-10">
        {user ? (
          <AuthenticatedRoutes user={user} onLogout={handleLogout} onEloUpdate={handleEloUpdate} sessionData={sessionData} setSessionData={setSessionData} />
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

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setTimeout(() => {
      setCheckingAuth(false);
    }, 1000);
  }, []);

  function handleAuth(userData) {
    setUser(userData);
  }

  function handleEloUpdate(newElo) {
    setUser((prevUser) => {
      const updated = { ...prevUser, elo_rating: newElo };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen w-full bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 relative">
        <BrowserRouter>
          <AppContent 
            user={user} 
            checkingAuth={checkingAuth} 
            handleAuth={handleAuth} 
            handleLogout={handleLogout} 
            handleEloUpdate={handleEloUpdate}
            sessionData={sessionData}
            setSessionData={setSessionData}
          />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;