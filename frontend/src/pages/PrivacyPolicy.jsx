import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Lock, Eye, Trash2, Server, Activity, Copy, Check, Database } from "lucide-react";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const POLICY_SECTIONS = [
  {
    icon: Eye,
    color: "text-blue-400",
    title: "What's Collected",
    body: "Your email and name at signup, your interview text answers, coding submissions, and session performance telemetry (scores and ELO ratings). If you use voice input, short audio clips are transcribed for live coaching feedback and are not stored after transcription — the audio file is deleted from the server the moment transcription completes.",
  },
  {
    icon: Activity,
    color: "text-emerald-400",
    title: "How It's Used",
    body: "Solely to run the interactive features — scoring your answers, tracking progress, and generating session replays. Nothing is sold, shared with advertisers, or used to train external models.",
  },
  {
    icon: Server,
    color: "text-purple-400",
    title: "Third Parties",
    body: "Answers are sent to Anthropic's Claude API for scoring, and code submissions to Judge0 for execution. When error monitoring is enabled, crash and exception data is sent to Sentry to help diagnose bugs. These are standard API calls in service of running the app, not data sales.",
  },
  {
    icon: Trash2,
    color: "text-rose-400",
    title: "Your Control",
    body: "You can permanently delete your account, session logs, and all associated data at any time directly from Settings. One technical caveat, in the interest of full accuracy: short-lived rate-limiting keys tied to your account ID may persist in server memory for up to 26 hours after your last request before automatically expiring — these aren't part of your profile or session data, just an internal usage-budget counter.",
  },
];

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const staggerItem = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

export default function PrivacyPolicy({ onGoBack }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = POLICY_SECTIONS.map((s) => `${s.title}\n${s.body}`).join("\n\n");
    navigator.clipboard.writeText(
      `InterviewCoach AI — Privacy Policy\n\n${text}\n\nLast updated: August 2026`
    ).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen w-full bg-[#000000] text-slate-300 font-sans px-6 py-16 relative overflow-hidden flex flex-col justify-center items-center">

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[20%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl w-full bg-[#08080C]/90 border border-white/[0.08] p-8 md:p-10 rounded-3xl backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_20px_40px_-10px_rgba(0,0,0,0.8)] relative z-10"
      >

        <button
          onClick={onGoBack}
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors mb-8 bg-white/[0.03] border border-white/[0.08] px-4 py-2 rounded-xl outline-none ${FOCUS_RING}`}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck size={20} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed font-medium mb-8">
          InterviewCoach AI is a personal portfolio project built to demonstrate full-stack engineering, not a commercial product. This policy describes plainly what happens with your data.
        </p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-4 text-sm leading-relaxed"
        >
          {POLICY_SECTIONS.map((section) => (
            <motion.div
              key={section.title}
              variants={staggerItem}
              className="bg-[#050508] border border-white/[0.06] p-5 rounded-2xl space-y-1.5 transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <section.icon size={16} className={section.color} /> {section.title}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{section.body}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-mono">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition-colors outline-none rounded ${FOCUS_RING}`}
          >
            {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy policy text</>}
          </button>
          <span>Last updated: August 2026</span>
        </div>

      </motion.div>
    </div>
  );
}