import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import InterviewRoom from "./pages/InterviewRoom";
import ReplayViewer from "./pages/ReplayViewer";
import "./App.css";

function App() {
  const [page, setPage] = useState("dashboard");
  const [sessionData, setSessionData] = useState(null);

  return (
    <div className="app">
      {page === "dashboard" && (
        <Dashboard
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