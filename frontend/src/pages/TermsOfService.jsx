import React from "react";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService({ onGoBack }) {
  return (
    <div className="min-h-screen w-full bg-black text-slate-300 font-sans px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <button onClick={onGoBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors mb-10">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight">Terms of Service</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>This is a demo/portfolio application provided as-is, free of charge, with no uptime or accuracy guarantees. It is not affiliated with Google, Amazon, Meta, Microsoft, Apple, or Netflix — company names are used only to simulate realistic interview scenarios.</p>
          <p>AI-generated scores and feedback are for practice purposes only and are not a guarantee of real interview performance.</p>
          <p>You're responsible for the content of any answers you submit. Don't submit anything illegal, harmful, or belonging to someone else.</p>
          <p>This project may change, break, or be taken down at any time without notice, since it's an actively developed personal project rather than a production service.</p>
        </div>
      </div>
    </div>
  );
}