import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import PreflightCheck from "./pages/PreflightCheck";
import InterviewRoom from "./pages/InterviewRoom";
import ReplayViewer from "./pages/ReplayViewer";
import CodingRoom from "./pages/CodingRoom";
import Settings from "./pages/Settings";
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

/**
 * ROUTING NOTE: this replaces the old manual useState("page") + conditional
 * render approach with react-router-dom (already installed, previously
 * unused). Every child page component keeps the EXACT SAME props it had
 * before — onFinish, onStart, onGoBack, etc. — just wired to navigate()
 * instead of setPage(). This was done deliberately narrow in scope: only
 * App.js changed, no other page file needed to be touched, which keeps
 * the blast radius of this migration contained to one file.
 *
 * sessionData still lives in App-level state (not the URL) since it's a
 * complex object (question, scenario, constraints, etc.) that doesn't
 * belong in a URL param — this mirrors how it worked before.
 */

function AuthenticatedApp({ user, onLogout, onEloUpdate }) {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <UserDashboard
            user={user}
            onLogout={onLogout}
            onStartNew={() => navigate("/setup")}
            onNavigateHistory={() => navigate("/replay")}
            onStartCoding={() => navigate("/coding")}
            onNavigateSettings={() => navigate("/settings")}
          />
        }
      />
      <Route
        path="/setup"
        element={
          <Dashboard
            user={user}
            onLogout={onLogout}
            onGoBack={() => navigate("/")}
            onStart={(data) => {
              setSessionData(data);
              navigate("/preflight");
            }}
          />
        }
      />
      <Route
        path="/preflight"
        element={
          <PreflightCheck
            onReady={() => navigate("/interview")}
            onSkip={() => navigate("/interview")}
          />
        }
      />
      <Route
        path="/interview"
        element={
          <InterviewRoom
            sessionData={sessionData}
            onFinish={() => navigate("/replay")}
            onEloUpdate={onEloUpdate}
          />
        }
      />
      <Route
        path="/coding"
        element={
          <CodingRoom
            sessionId={sessionData?.session_id}
            onFinish={() => navigate("/")}
          />
        }
      />
      <Route path="/replay" element={<ReplayViewer sessionId={sessionData?.session_id} />} />
      <Route
        path="/settings"
        element={<Settings user={user} onLogout={onLogout} onGoBack={() => navigate("/")} />}
      />
      {/* Unknown authenticated route: fall back to dashboard rather than a blank page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function UnauthenticatedApp({ onAuth }) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={<Landing onGetStarted={() => navigate("/signup")} onSignIn={() => navigate("/login")} />}
      />
      <Route path="/login" element={<Login onAuth={onAuth} onSwitchToSignup={() => navigate("/signup")} />} />
      <Route path="/signup" element={<Signup onAuth={onAuth} onSwitchToLogin={() => navigate("/login")} />} />
      {/* Unknown unauthenticated route: fall back to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setCheckingAuth(false);
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

  if (checkingAuth) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0a0f1e" }} />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        {user ? (
          <AuthenticatedApp user={user} onLogout={handleLogout} onEloUpdate={handleEloUpdate} />
        ) : (
          <UnauthenticatedApp onAuth={handleAuth} />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;