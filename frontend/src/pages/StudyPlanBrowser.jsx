import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../config";
import StudyPlan from "./StudyPlan";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, BookOpen, Search, Network, BrainCircuit, Activity, 
  CheckCircle2, Lock, AlertTriangle, MessageSquare, Database, 
  HardDrive, Shield, LayoutTemplate, LayoutGrid, ChevronRight 
} from "lucide-react";

export default function StudyPlanBrowser({ onGoBack }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Topics");
  const [activeFilter, setActiveFilter] = useState("All");
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
        const fetchedTopics = (res.data.topics || []).map((t, i) => {
          let status = 'locked';
          if (i % 4 === 0) status = 'passed';
          else if (i % 3 === 0) status = 'gap';
          return { ...t, status: t.status || status };
        });
        setTopics(fetchedTopics);
      } catch (err) {
        console.error("Failed to load topics:", err);
      }
      setLoading(false);
    }
    fetchTopics();
  }, []);

  const filteredTopics = topics.filter(t => {
    const matchesSearch = t.name.toLowerCase().replace(/_/g, " ").includes(searchQuery.toLowerCase());
    const matchesCategory = activeTab === "All Topics" || (t.category || "other") === activeTab;
    const matchesStatus = activeFilter === "All" || 
                         (activeFilter === "Passed" && t.status === "passed") ||
                         (activeFilter === "Active Gaps" && t.status === "gap") ||
                         (activeFilter === "Locked" && t.status === "locked");
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const grouped = filteredTopics.reduce((acc, t) => {
    const cat = t.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const categories = ["All Topics", ...Object.keys(topics.reduce((acc, t) => {
    const cat = t.category || "other";
    acc[cat] = true;
    return acc;
  }, {}))];

  const getCategoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if (c.includes('algorithm')) return <Network size={16} />;
    if (c.includes('behavioral')) return <MessageSquare size={16} />;
    if (c.includes('database')) return <Database size={16} />;
    if (c.includes('data structure')) return <HardDrive size={16} />;
    if (c.includes('machine learning')) return <BrainCircuit size={16} />;
    if (c.includes('security')) return <Shield size={16} />;
    if (c.includes('system design')) return <LayoutTemplate size={16} />;
    return <BookOpen size={16} />;
  };

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
    <div className="min-h-screen bg-[#050508] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative flex flex-col">
      {/* Ambient Spotlights */}
      <div className="fixed top-[-10%] left-[20%] w-[40vw] h-[40vw] bg-indigo-900/10 blur-[150px] pointer-events-none mix-blend-screen rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-blue-900/10 blur-[120px] pointer-events-none mix-blend-screen rounded-full z-0" />
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      {/* Top Header */}
      <header className="h-16 border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-2xl flex items-center justify-between px-6 z-30 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-[0_0_15px_rgba(79,70,229,0.5)]">IC</div>
          <span className="font-semibold text-white tracking-tight text-sm flex items-center gap-2">
            InterviewCoach <span className="text-slate-600 font-normal">/</span> <span className="text-slate-400">Knowledge Atlas</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 rounded-md">
             <span>{topics.filter(t => t.status === 'passed').length} NODES ACTIVE</span>
           </div>

           <div className="relative group w-48 sm:w-64">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search topics..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-[#0A0A0F] border border-white/10 rounded-lg py-1.5 pl-9 pr-8 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-600 shadow-inner"
             />
             <kbd className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-500">⌘K</kbd>
           </div>

           <div className="w-px h-5 bg-white/10 hidden sm:block" />

           <button onClick={onGoBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.06] px-3.5 py-1.5 rounded-lg hover:bg-white/[0.05]">
            <ArrowLeft size={14} /> Dashboard
          </button>
        </div>
      </header>

      {/* Main Layout (Left Sidebar + Right Grid) */}
      <div className="flex-1 w-full flex overflow-hidden relative z-20">
        
        {/* Left Sidebar */}
        <aside className="w-[240px] flex-shrink-0 border-r border-white/[0.06] bg-[#000000] overflow-y-auto hidden md:flex flex-col py-6">
          <div className="px-4 mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-2">Categories</h3>
            <nav className="space-y-1">
              {categories.map((cat) => {
                const isActive = activeTab === cat;
                const count = cat === "All Topics" ? topics.length : topics.filter(t => (t.category || "other") === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all outline-none ${
                      isActive ? "bg-indigo-600/10 text-indigo-300" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cat === "All Topics" ? <LayoutGrid size={16} /> : getCategoryIcon(cat)}
                      <span className="truncate">{cat.replace(/_/g, " ")}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-2">Filters</h3>
            <nav className="space-y-1">
              {[
                { id: "Passed", icon: CheckCircle2, color: "text-emerald-400", count: topics.filter(t => t.status === 'passed').length },
                { id: "Active Gaps", icon: AlertTriangle, color: "text-amber-400", count: topics.filter(t => t.status === 'gap').length },
                { id: "Locked", icon: Lock, color: "text-slate-500", count: topics.filter(t => t.status === 'locked').length }
              ].map((f) => {
                const isActive = activeFilter === f.id;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id === activeFilter ? "All" : f.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all outline-none ${
                      isActive ? "bg-white/[0.05] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={f.color} />
                      <span>{f.id}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Main Grid Area */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-8 lg:p-12 relative">
          <div className={`max-w-7xl mx-auto transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Knowledge Graph</h1>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                Explore the CS curriculum. Select any topic to inspect its prerequisite chain and company relevance weights.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-500 font-mono text-sm gap-4">
                 <div className="w-8 h-8 border-[3px] border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                 <span className="uppercase tracking-widest animate-pulse">Synchronizing Nodes...</span>
              </div>
            ) : (
              <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-12">
                {Object.entries(grouped).map(([category, catTopics]) => (
                  <motion.div key={category} variants={itemVars} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                      <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        {getCategoryIcon(category)}
                      </div>
                      <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-300">
                        {category.replace(/_/g, " ")}
                      </h2>
                      <span className="text-[10px] font-mono text-slate-600 ml-2">{catTopics.length} topics</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {catTopics.map((t) => {
                        const isLocked = t.status === 'locked';
                        const isPassed = t.status === 'passed';
                        const isGap = t.status === 'gap';

                        return (
                          <GlassCard 
                            key={t.name} 
                            mousePos={mousePos}
                            onClick={() => !isLocked && setSelectedTopic(t.name)}
                            disabled={isLocked}
                          >
                            <div className="flex flex-col h-full justify-between">
                              <div>
                                <div className="flex items-start justify-between mb-4">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Network size={14} />
                                  </div>
                                  {isPassed ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                      <CheckCircle2 size={10} /> PASSED
                                    </span>
                                  ) : isGap ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> ACTIVE GAP
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white/[0.04] border border-white/10 px-2 py-1 rounded">
                                      <Lock size={10} /> LOCKED
                                    </span>
                                  )}
                                </div>
                                <h3 className={`text-base font-bold tracking-tight capitalize mb-2 ${isLocked ? 'text-slate-400' : 'text-white'}`}>
                                  {t.name.replace(/_/g, " ")}
                                </h3>
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="bg-[#050508] border border-white/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums tracking-widest uppercase shadow-inner">
                                    L{t.difficulty || 3}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="pt-3 border-t border-white/[0.04] mt-auto">
                                {!isLocked && (
                                  <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                    <Activity size={12} /> Inspect Dependency Chain <ChevronRight size={12} />
                                  </p>
                                )}
                              </div>
                            </div>
                          </GlassCard>
                        );
                      })}
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
      </div>

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

function GlassCard({ children, mousePos, onClick, disabled }) {
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
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left rounded-xl bg-[#0B0C10] border p-5 overflow-hidden transition-all duration-200 group outline-none h-44 ${
        disabled 
          ? "border-white/[0.04] opacity-70 cursor-not-allowed" 
          : "border-white/[0.08] hover:border-indigo-500/30 cursor-pointer shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]"
      }`}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(300px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.03), transparent 40%)`,
          opacity: isHovered && !disabled ? 1 : 0
        }}
      />
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </motion.button>
  );
}