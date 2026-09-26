// Rendered with the shared blueprint LegalPage (components/app/LegalPage).
import React from "react";
import { Eye, Activity, Server, Trash2 } from "lucide-react";
import LegalPage from "../components/app/LegalPage";

const POLICY_SECTIONS = [
  {
    icon: Eye,
    title: "What's Collected",
    body: "Your email and name at signup, your interview text answers, coding submissions, and session performance telemetry (scores and ELO ratings). If you use voice input, short audio clips are transcribed for live coaching feedback and are not stored after transcription — the audio file is deleted from the server the moment transcription completes.",
  },
  {
    icon: Activity,
    title: "How It's Used",
    body: "Solely to run the interactive features — scoring your answers, tracking progress, and generating session replays. Nothing is sold, shared with advertisers, or used to train external models.",
  },
  {
    icon: Server,
    title: "Third Parties",
    body: "Answers are sent to Anthropic's Claude API for scoring, and code submissions to Judge0 for execution. When error monitoring is enabled, crash and exception data is sent to Sentry to help diagnose bugs. These are standard API calls in service of running the app, not data sales.",
  },
  {
    icon: Trash2,
    title: "Your Control",
    body: "You can permanently delete your account, session logs, and all associated data at any time directly from Settings. One technical caveat, in the interest of full accuracy: short-lived rate-limiting keys tied to your account ID may persist in server memory for up to 26 hours after your last request before automatically expiring — these aren't part of your profile or session data, just an internal usage-budget counter.",
  },
];

export default function PrivacyPolicy({ onGoBack }) {
  return (
    <LegalPage
      index="07"
      label="Privacy"
      title="What happens with your data."
      intro="InterviewCoach AI is a personal portfolio project built to demonstrate full-stack engineering, not a commercial product. This policy describes plainly what happens with your data."
      sections={POLICY_SECTIONS}
      meta="Last updated: August 2026"
      copyTitle="InterviewCoach AI — Privacy Policy"
      onGoBack={onGoBack}
    />
  );
}
