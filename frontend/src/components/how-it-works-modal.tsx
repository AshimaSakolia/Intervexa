"use client";

import { Modal } from "@/components/modal";

const STEPS = [
  {
    title: "Upload a resume",
    desc: "We read your resume to generate questions grounded in what you've actually built.",
  },
  {
    title: "Pick a role and difficulty",
    desc: "Choose the target role, interview type, and how hard you want it to be.",
  },
  {
    title: "Answer adaptively",
    desc: "Each question reacts to your last answer — harder when you're strong, clarifying when you're not.",
  },
  {
    title: "Get a full report",
    desc: "Category scores, missed concepts, resume claim confidence, and a personalized study plan.",
  },
];

export function HowItWorksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent mb-1">Getting started</p>
            <h2 className="text-lg font-semibold">How InterviewIQ works</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint hover:text-ink transition-colors shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="font-mono text-xs text-ink-faint shrink-0 pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-sm text-ink-soft leading-relaxed mt-0.5">{step.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
