import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../config";
import StudyPlan from "./StudyPlan";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Search, Network, BrainCircuit, Activity } from "lucide-react";

export default function StudyPlanBrowser({ onGoBack }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Topics");
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  // Filter topics based on search query
  const filteredTopics = topics.filter(t => 
    t.name.toLowerCase().replace(/_/g, " ").includes(searchQuery.toLowerCase())
  );

  // Group filtered topics by category
  const grouped = filteredTopics.reduce((acc, t) => {
    const cat = t.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  // Extract unique categories for tabs
  const categories = ["All Topics", ...Object.keys(topics.reduce((acc, t) => {
    const cat = t.category || "other";
    acc[cat] = true;
    return acc;
  }, {}))];

  // Microscopic film grain overlay
  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col">
      
      {/* LAYER 1: Ambient Spotlights (z-0) */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[150px] pointer-events-none mix-blend-screen rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[120px] pointer-events-none mix-blend-screen rounded-full z-0" />

      {/* LAYER 2: Noise Grain (z-10) */}
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      {/* LAYER 3: Sticky Control Header (z-50) */}
      <header className="sticky top-0 z-50 h-16 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-12 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onGoBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.05] px-3 py-1.5 rounded-full hover:bg-white/[0.05]">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-white text-black font-bold text-[9px] shadow-[0_0_10px_rgba(255,255,255,0.2)]">IC</div>
            <span className="text-sm font-semibold tracking-tight text-white">Knowledge Atlas</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Real-time Progress HUD */}
           <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 rounded-full">
             <BrainCircuit size={14} className="text-indigo-400" />
             <span>{topics.length || 93} Nodes Online</span>
           </div>

           {/* Global Search Input */}
           <div className="relative group w-48 sm:w-64">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
             <input 
               type="text" 
               placeholder="Search topics..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-[#0A0A0A] border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-slate-600"
             />
           </div>
        </div>
      </header>

      {/* LAYER 4: Main Content (z-20) */}
      <main className="flex-1 w-full relative z-20 px-6 lg:px-12 py-10 max-w-[1600px] mx-auto">
        <div className={`transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-3">Knowledge Graph</h1>
            <p className="text-sm md:text-base text-slate-400 font-medium max-w-2xl leading-relaxed">
              Explore the entire computer science curriculum. Select any node to reveal its full prerequisite dependency chain and company-specific relevance weights.
            </p>
          </div>

          {/* Category Tabs (Framer Motion Sliding Pill) */}
          <div className="flex flex-wrap items-center gap-2 mb-10 pb-4 border-b border-white/[0.06]">
            {categories.map((cat) => {
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`relative px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryTab"
                      className="absolute inset-0 bg-white/[0.06] border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-full z-0"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{cat.replace(/_/g, " ")}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono text-sm gap-4">
               <div className="w-8 h-8 border-[3px] border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
               <span className="uppercase tracking-widest animate-pulse">Synchronizing Graph Nodes...</span>
            </div>
          ) : (
            <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-12">
              {Object.entries(grouped)
                .filter(([category]) => activeTab === "All Topics" || activeTab === category)
                .map(([category, catTopics]) => (
                <motion.div key={category} variants={itemVars} className="space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                    <Network size={16} /> {category.replace(/_/g, " ")}
                    <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded ml-2 tabular-nums">
                      {catTopics.length} NODES
                    </span>
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {catTopics.map((t) => (
                      <GlassCard 
                        key={t.name} 
                        mousePos={mousePos}
                        onClick={() => setSelectedTopic(t.name)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <BookOpen size={16} />
                          </div>
                          <span className="bg-white/[0.04] border border-white/10 text-slate-400 text-[10px] font-bold px-2 py-1 rounded tabular-nums tracking-widest uppercase shadow-inner">
                            Level {t.difficulty}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight capitalize mb-2 group-hover:text-indigo-300 transition-colors">
                          {t.name.replace(/_/g, " ")}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-auto pt-2">
                          <Activity size={12} className="text-slate-600" /> Inspect Dependency Chain
                        </p>
                      </GlassCard>
                    ))}
                  </div>
                </motion.div>
              ))}
              
              {Object.keys(grouped).length === 0 && (
                <div className="py-20 text-center text-slate-500 text-sm font-medium">
                  No nodes found matching "{searchQuery}".
                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      {/* Prerequisite Inspector Modal Overlay */}
      <AnimatePresence>
        {selectedTopic && (
          <StudyPlan
            topicName={selectedTopic}
            company={null}
            onClose={() => setSelectedTopic(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Reusable Deep Glass Card with Vercel-style cursor tracking
function GlassCard({ children, mousePos, onClick }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
  }, []);

  const isHovered = rect && mousePos.x >= rect.left && mousePos.x <= rect.right && mousePos.y >= rect.top && mousePos.y <= rect.bottom;
  const cursorX = rect ? mousePos.x - rect.left : 0;
  const cursorY = rect ? mousePos.y - rect.top : 0;

  return (
    <motion.button 
      ref={cardRef}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative text-left rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)] group outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 w-full flex flex-col h-full min-h-[140px]"
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(300px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.04), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </motion.button>
  );
}