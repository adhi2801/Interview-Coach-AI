import React from "react";
import { ArrowLeft, ShieldCheck, Lock, Eye, Trash2, Server, Activity } from "lucide-react";

export default function PrivacyPolicy({ onGoBack }) {
  return (
    <div className="min-h-screen w-full bg-[#000000] text-slate-300 font-sans px-6 py-16 relative overflow-hidden flex flex-col justify-center items-center">
      
      {/* Ambient Volumetric Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[20%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Main Glass Vault Card */}
      <div className="max-w-3xl w-full bg-[#08080C]/90 border border-white/[0.08] p-8 md:p-10 rounded-3xl backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_20px_40px_-10px_rgba(0,0,0,0.8)] relative z-10">
        
        {/* Navigation Control */}
        <button 
          onClick={onGoBack} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors mb-8 bg-white/[0.03] border border-white/[0.08] px-4 py-2 rounded-xl outline-none"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Title Block */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck size={20} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed font-medium mb-8">
          InterviewCoach AI is a personal portfolio project built to demonstrate full-stack engineering, not a commercial product. This policy describes plainly what happens with your data.
        </p>

        {/* Itemized Policy Sub-Cards */}
        <div className="space-y-4 text-sm leading-relaxed">
          
          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Eye size={16} className="text-blue-400" /> What's Collected
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your email and name at signup, your interview text answers, coding submissions, and session performance telemetry (scores and ELO ratings). If you use voice input, short audio clips are transcribed for live coaching feedback and are not stored after transcription.
            </p>
          </div>

          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Activity size={16} className="text-emerald-400" /> How It's Used
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solely to run the interactive features—scoring your answers, tracking progress, and generating session replays. Nothing is sold, shared with advertisers, or used to train external models.
            </p>
          </div>

          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Server size={16} className="text-purple-400" /> Third Parties
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Answers are sent to Anthropic's Claude API for scoring, and code submissions to Judge0 for execution. Both are standard API calls, not data sales.
            </p>
          </div>

          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Trash2 size={16} className="text-rose-400" /> Your Control
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can permanently delete your account, session logs, and all associated data at any time directly from Settings.
            </p>
          </div>

        </div>

        {/* Footer Timestamp */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Metadata Verification: Verified</span>
          <span>Last updated: August 2026</span>
        </div>

      </div>
    </div>
  );
}