import React from "react";
import { ArrowLeft, FileText, AlertTriangle, ShieldCheck, Scale } from "lucide-react";

export default function TermsOfService({ onGoBack }) {
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
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Scale size={20} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        </div>

        {/* Itemized Terms Sub-Cards */}
        <div className="space-y-4 text-sm leading-relaxed">
          
          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <FileText size={16} className="text-blue-400" /> Demo &amp; Portfolio Application
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This is a personal demo and portfolio application provided as-is, free of charge, with no uptime or accuracy guarantees. It is not affiliated with Google, Amazon, Meta, Microsoft, Apple, or Netflix—company names are used solely to simulate realistic technical interview scenarios.
            </p>
          </div>

          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck size={16} className="text-emerald-400" /> Practice Feedback &amp; AI Disclaimer
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-generated scores, ELO ratings, and qualitative feedback are for practice purposes only and do not guarantee real-world interview performance or employment offers.
            </p>
          </div>

          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <AlertTriangle size={16} className="text-amber-400" /> User Responsibilities
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are responsible for the content of any answers or code submissions you provide. Do not submit unlawful, harmful, or proprietary third-party information.
            </p>
          </div>

          <div className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Scale size={16} className="text-indigo-400" /> Availability &amp; Service Changes
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This application may be updated, modified, or taken offline at any time without prior notice as part of active development.
            </p>
          </div>

        </div>

        {/* Footer Timestamp */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Terms Version: 1.0</span>
          <span>Last updated: August 2026</span>
        </div>

      </div>
    </div>
  );
}