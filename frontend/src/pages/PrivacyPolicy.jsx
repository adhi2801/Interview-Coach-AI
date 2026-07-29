import React from "react";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy({ onGoBack }) {
  return (
    <div className="min-h-screen w-full bg-black text-slate-300 font-sans px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <button onClick={onGoBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors mb-10">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight">Privacy Policy</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>InterviewCoach AI is a personal portfolio project built to demonstrate full-stack engineering, not a commercial product. This policy describes what it does with your data, plainly.</p>
          <p><strong className="text-white">What's collected:</strong> your email and name at signup, your interview answers and coding submissions, and session performance data (scores, ELO rating). If you use voice input, short audio clips are transcribed for live coaching feedback and are not stored after transcription.</p>
          <p><strong className="text-white">How it's used:</strong> solely to run the features you interact with — scoring your answers, tracking progress, and generating your session replays. Nothing is sold, shared with advertisers, or used to train external models.</p>
          <p><strong className="text-white">Third parties:</strong> answers are sent to Anthropic's Claude API for scoring, and code submissions to Judge0 for execution. Both are standard API calls, not data sales.</p>
          <p><strong className="text-white">Your control:</strong> you can permanently delete your account and all associated data at any time from Settings.</p>
          <p className="text-slate-500 text-xs pt-4">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}</p>
        </div>
      </div>
    </div>
  );
}