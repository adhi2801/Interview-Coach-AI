// Rendered with the shared blueprint LegalPage (components/app/LegalPage).
import React from "react";
import { FileText, AlertTriangle, ShieldCheck, Scale } from "lucide-react";
import LegalPage from "../components/app/LegalPage";

const TERMS_SECTIONS = [
  {
    icon: FileText,
    title: "Demo & Portfolio Application",
    body: "This is a personal demo and portfolio application provided as-is, free of charge, with no uptime or accuracy guarantees. It is not affiliated with Google, Amazon, Meta, Microsoft, Apple, or Netflix — company names are used solely to simulate realistic technical interview scenarios.",
  },
  {
    icon: ShieldCheck,
    title: "Practice Feedback & AI Disclaimer",
    body: "AI-generated scores, ELO ratings, and qualitative feedback are for practice purposes only and do not guarantee real-world interview performance or employment offers.",
  },
  {
    icon: AlertTriangle,
    title: "User Responsibilities",
    body: "You are responsible for the content of any answers or code submissions you provide, and for keeping your password confidential. Do not submit unlawful, harmful, or proprietary third-party information.",
  },
  {
    icon: Scale,
    title: "Availability & Service Changes",
    body: "This application may be updated, modified, or taken offline at any time without prior notice as part of active development.",
  },
];

export default function TermsOfService({ onGoBack }) {
  return (
    <LegalPage
      index="08"
      label="Terms"
      title="The terms, in plain words."
      intro="A free practice tool, provided as-is. Here is what that means for you."
      sections={TERMS_SECTIONS}
      meta="Terms version 1.0 · Last updated: August 2026"
      copyTitle="InterviewCoach AI — Terms of Service"
      onGoBack={onGoBack}
    />
  );
}
