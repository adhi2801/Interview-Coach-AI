import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import InterviewRoom from "./pages/InterviewRoom";
import ReplayViewer from "./pages/ReplayViewer";
import "./App.css";

function App() {
  const [authView, setAuthView] = useState("login"); // "login" or "signup"
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

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setPage("dashboard");
  }

  if (checkingAuth) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0a0f1e" }} />;
  }

  // Not logged in: show login or signup
  if (!user) {
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
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onStart={(data) => {
            setSessionData(data);
            setPage("interview");
          }}
        />
      )}
      {page === "interview" && (
        <InterviewRoom
          sessionData={sessionData}
          onFinish={() => setPage("replay")}
        />
      )}
      {page === "replay" && (
        <ReplayViewer sessionId={sessionData?.session_id} />
      )}
    </div>
  );
}

export default App;