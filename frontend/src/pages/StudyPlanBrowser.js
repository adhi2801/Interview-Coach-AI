import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import StudyPlan from "./StudyPlan";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function StudyPlanBrowser({ onGoBack }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await axios.get(`${API_URL}/topics`);
        setTopics(res.data.topics || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchTopics();
  }, []);

  const grouped = topics.reduce((acc, t) => {
    const cat = t.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans px-8 py-10">
      <button onClick={onGoBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors mb-10">
        <ArrowLeft size={16} /> Return to Dashboard
      </button>

      <div className="flex items-center gap-3 mb-2">
        <BookOpen size={20} className="text-blue-500" />
        <h1 className="text-3xl font-extrabold tracking-tighter text-white">Study Plan</h1>
      </div>
      <p className="text-sm text-slate-500 mb-10">Pick any topic to see the full prerequisite chain you need to master it.</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading topics...</p>
      ) : (
        Object.entries(grouped).map(([category, catTopics]) => (
          <div key={category} className="mb-10">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">
              {category.replace(/_/g, " ")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {catTopics.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTopic(t.name)}
                  className="bg-white/[0.03] border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors capitalize"
                >
                  {t.name.replace(/_/g, " ")}
                  <span className="text-slate-600 text-xs ml-2">L{t.difficulty}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {selectedTopic && (
        <StudyPlan
          topicName={selectedTopic}
          company={null}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}