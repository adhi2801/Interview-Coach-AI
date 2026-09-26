import React, { useState, useEffect, useRef } from "react";
import { AppHeader, PageIntro } from "../components/app/AppChrome";
import api from "../lib/api";
import StudyPlan from "./StudyPlan";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Search, Network, BrainCircuit, Activity, 
  CheckCircle2, Lock, AlertTriangle, MessageSquare, Database, 
  HardDrive, Shield, LayoutTemplate, LayoutGrid, ChevronRight 
} from "lucide-react";
import { LiquidGlass } from "../components/fx/LiquidGlass";

export default function StudyPlanBrowser({ onGoBack }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Topics");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortMode, setSortMode] = useState("category"); // "category" | "gaps" | "alpha" | "difficulty"
  const [difficultyFilter, setDifficultyFilter] = useState("All");
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
        const res = await api.get(`/topics/status`);
        // Status, prerequisites, and gap urgency now come from real per-user
        // data (gaps_identified, topics_covered, TopicPrerequisite) via
        // /topics/status. Default honestly to "unattempted" if the backend
        // ever omits status, rather than fabricating one.
        const fetchedTopics = (res.data.topics || []).map((t) => ({
          ...t,
          status: t.status || "unattempted",
          prerequisites: t.prerequisites || [],
        }));
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
    const matchesDifficulty = difficultyFilter === "All" || (t.difficulty || 3) === difficultyFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesDifficulty;
  });

  const URGENCY_RANK = { critical: 3, high: 2, medium: 1, low: 0 };
  function sortTopics(list) {
    const arr = [...list];
    if (sortMode === "gaps") {
      // Real urgency first, using actual gap urgency data — not just gap/not-gap
      arr.sort((a, b) => {
        const au = a.status === "gap" ? URGENCY_RANK[a.urgency || "low"] : -1;
        const bu = b.status === "gap" ? URGENCY_RANK[b.urgency || "low"] : -1;
        return bu - au;
      });
    } else if (sortMode === "alpha") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "difficulty") {
      arr.sort((a, b) => (b.difficulty || 3) - (a.difficulty || 3));
    }
    // "category" mode = leave as returned (already ordered by backend query)
    return arr;
  }

  const grouped = filteredTopics.reduce((acc, t) => {
    const cat = t.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});
  // Apply sort within each category group, not just to the flat filtered list
  Object.keys(grouped).forEach((cat) => { grouped[cat] = sortTopics(grouped[cat]); });

  // Real "Recommended Next" — unattempted AND every real prerequisite already passed.
  // No topic qualifies → show nothing, never fabricate a suggestion.
  const passedNames = new Set(topics.filter(t => t.status === "passed").map(t => t.name));
  const recommended = topics
    .filter(t => t.status === "unattempted" && (t.prerequisites || []).every(p => passedNames.has(p)))
    .slice(0, 4);

  const gapCount = topics.filter(t => t.status === "gap").length;

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


  
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-transparent font-sans text-slate-200 selection:bg-indigo-500/40">
      <AppHeader back={{ label: "Overview", onClick: onGoBack }}>
        <div className="relative hidden w-44 sm:block md:w-56">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            type="text"
            placeholder="Filter topics"
            aria-label="Filter topics"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-white/10 bg-[#07070b] py-1.5 pl-8 pr-3 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </AppHeader>

      <PageIntro
        index="04"
        label="Knowledge graph"
        title={`${topics.length || 93} topics. Every prerequisite.`}
        subtitle="Select any topic to inspect its prerequisite chain and how much each company weighs it. Statuses come from your scored answers."
        aside={
          <div className="grid grid-cols-3 border border-white/[0.08] bg-[#050507]/70">
            <div className="border-r border-white/[0.08] px-4 py-4">
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-emerald-300">{topics.filter((t) => t.status === "passed").length}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Solid</p>
            </div>
            <div className="border-r border-white/[0.08] px-4 py-4">
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-amber-300">{gapCount}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Gaps</p>
            </div>
            <div className="px-4 py-4">
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white/70">{topics.length}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Total</p>
            </div>
          </div>
        }
      />

      {/* Main Layout (Left Sidebar + Right Grid) */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1280px] flex-1 border-x border-white/[0.08]">
        
        {/* Left Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[240px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.08] py-6 md:flex" data-lenis-prevent>
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
        <main className="relative min-w-0 flex-1 p-4 md:p-8 lg:p-10">
          <div className={`mx-auto max-w-7xl transform transition-all duration-700 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="relative mb-6 sm:hidden">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                type="text"
                placeholder="Filter topics"
                aria-label="Filter topics"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-white/10 bg-[#07070b] py-2.5 pl-8 pr-3 font-mono text-[12px] text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            

            {/* Sort + difficulty controls — real reordering, not decorative tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest mr-1">Sort</span>
              <div className="flex items-center bg-white/[0.02] border border-white/[0.06] p-1 rounded-lg">
                {[["category", "Category"], ["gaps", "Gaps First"], ["difficulty", "Difficulty"], ["alpha", "A–Z"]].map(([key, label]) => (
                  <button key={key} onClick={() => setSortMode(key)}
                    className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md transition-all outline-none ${sortMode === key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-white/[0.02] border border-white/[0.06] p-1 rounded-lg ml-2">
                {[["All", "All"], [3, "Easy"], [5, "Medium"], [7, "Hard"]].map(([key, label]) => (
                  <button key={label} onClick={() => setDifficultyFilter(key)}
                    className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md transition-all outline-none ${difficultyFilter === key ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended Next — real: unattempted + every real prerequisite already passed.
                Renders nothing if no topic qualifies; never fabricates a suggestion. */}
            {recommended.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <Activity size={11} className="text-indigo-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recommended Next</span>
                  <span className="text-[10px] text-slate-600 font-medium">Unblocked · prerequisites passed · not yet attempted</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {recommended.map((t) => (
                    <div key={t.name} onClick={() => setSelectedTopic(t.name)}
                      className="relative rounded-xl bg-linear-to-br from-[#111420] to-[#0f1117] border border-white/[0.1] hover:border-indigo-500/40 p-4 cursor-pointer transition-all hover:-translate-y-0.5">
                      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-indigo-500/50 to-transparent" />
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">{t.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">{t.name.replace(/_/g, " ")}</h3>
                      <div className="flex items-center gap-1 flex-wrap mb-2">
                        {(t.prerequisites || []).map((p) => (
                          <span key={p} className="text-[9px] text-emerald-400/80 bg-emerald-500/[0.08] border border-emerald-500/15 px-1.5 py-0.5 rounded font-medium">✓ {p}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-indigo-400 text-[11px] font-bold">
                        <Activity size={11} /> Ready to attempt
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-500 font-mono text-sm gap-4">
                 <div className="w-8 h-8 border-[3px] border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                 <span className="uppercase tracking-widest animate-pulse">Synchronizing Nodes...</span>
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(grouped).map(([category, catTopics]) => (
                  <motion.div key={category} variants={itemVars} initial="hidden" whileInView="show" viewport={{ amount: 0.08 }} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                      <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        {getCategoryIcon(category)}
                      </div>
                      <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-300 shrink-0 whitespace-nowrap">
                        {category.replace(/_/g, " ")}
                      </h2>
                      <span className="text-[10px] font-mono text-slate-600 shrink-0 whitespace-nowrap">{catTopics.length} topics</span>
                      {(() => {
                        const passedInCat = catTopics.filter(t => t.status === "passed").length;
                        const pct = catTopics.length ? Math.round((passedInCat / catTopics.length) * 100) : 0;
                        return (
                          <div className="flex items-center gap-2 ml-1 shrink-0">
                            <div className="h-[3px] w-24 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                              <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 tabular-nums whitespace-nowrap">{passedInCat}/{catTopics.length}</span>
                          </div>
                        );
                      })()}
                      <div className="flex-1 h-px bg-white/[0.04] ml-2 min-w-[8px]" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {catTopics.map((t) => {
                        // "isLocked" no longer disables the card — every topic is
                        // inspectable regardless of status. It's still shown as a
                        // badge for information, just not used to block clicks.
                        const isPassed = t.status === 'passed';
                        const isGap = t.status === 'gap';
                        const isLocked = t.status === 'locked';

                        return (
                          <GlassCard 
                            key={t.name} 
                            mousePos={mousePos}
                            onClick={() => setSelectedTopic(t.name)}
                            urgent={isGap && (t.urgency === "critical" || t.urgency === "high")}
                          >
                            <div className="flex flex-col h-full justify-between relative">
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
                                  ) : isLocked ? (
                                    <span title="Prerequisite not detected in recent session history" className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white/[0.04] border border-white/10 px-2 py-1 rounded cursor-help">
                                      <Lock size={10} /> LOCKED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white/[0.04] border border-white/10 px-2 py-1 rounded">
                                      NOT YET ATTEMPTED
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base font-bold tracking-tight capitalize mb-2 text-white">
                                  {t.name.replace(/_/g, " ")}
                                </h3>
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="bg-[#0a0a10]/90 border border-white/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums tracking-widest uppercase shadow-inner">
                                    L{t.difficulty || 3}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="pt-3 border-t border-white/[0.04] mt-auto">
                                <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                  <Activity size={12} /> Inspect Dependency Chain <ChevronRight size={12} />
                                </p>
                                {isGap && (t.urgency === "critical" || t.urgency === "high") && (
                                  <p className="text-[10px] font-medium text-amber-400/70 mt-1.5">↗ High-impact · practise next</p>
                                )}
                                {isPassed && (
                                  <p className="text-[10px] font-medium text-emerald-400/60 mt-1.5">✓ Addressed in session</p>
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
              </div>
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

function GlassCard({ children, onClick, urgent }) {
  return (
    <LiquidGlass
      as="button"
      onClick={onClick}
      interactive
      tilt
      tone={urgent ? "amber" : "dark"}
      radius={10}
      frost={18}
      className={`text-left p-5 h-44 w-full outline-none group ${urgent ? "shadow-[0_0_40px_-12px_rgba(245,158,11,0.45)]" : ""}`}
      contentClassName="relative z-10 w-full h-full flex flex-col"
    >
      {children}
    </LiquidGlass>
  );
}