import { useState, useEffect } from "react";
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

function App() {
  const [authView, setAuthView] = useState("landing"); // "landing", "login", or "signup"
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [sessionData, setSessionData] = useState(null);

  // On app load, check if a token already exists in localStorage
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
    setPage("dashboard");
  }

  if (checkingAuth) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0a0f1e" }} />;
  }

  // Not logged in: show landing, then login or signup
  if (!user) {
    if (authView === "landing") {
      return (
        <Landing
          onGetStarted={() => setAuthView("signup")}
          onSignIn={() => setAuthView("login")}
        />
      );
    }
    return authView === "login" ? (
      <Login onAuth={handleAuth} onSwitchToSignup={() => setAuthView("signup")} />
    ) : (
      <Signup onAuth={handleAuth} onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  // Logged in: show the actual app
  return (
    <div className="app">
      {page === "dashboard" && (
        <UserDashboard
          user={user}
          onLogout={handleLogout}
          onStartNew={() => setPage("setup")}
          onNavigateHistory={() => setPage("replay")}
          onStartCoding={() => setPage("coding")}
          onNavigateSettings={() => setPage("settings")}
        />
      )}
      {page === "settings" && (
        <Settings
          user={user}
          onLogout={handleLogout}
          onGoBack={() => setPage("dashboard")}
        />
      )}
      {page === "setup" && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onGoBack={() => setPage("dashboard")}
          onStart={(data) => {
            setSessionData(data);
            setPage("preflight");
          }}
        />
      )}
      {page === "preflight" && (
        <PreflightCheck
          onReady={() => setPage("interview")}
          onSkip={() => setPage("interview")}
        />
      )}
      {page === "interview" && (
        <InterviewRoom
          sessionData={sessionData}
          onFinish={() => setPage("replay")}
          onEloUpdate={handleEloUpdate}
        />
      )}

      {page === "coding" && (
        <CodingRoom
          sessionId={sessionData?.session_id}
          onFinish={() => setPage("dashboard")}
        />
      )}
      {page === "replay" && (
        <ReplayViewer sessionId={sessionData?.session_id} />
      )}
    </div>
  );
}

export default App;