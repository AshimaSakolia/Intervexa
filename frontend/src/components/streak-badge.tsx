"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { computeStreak, lastNDays } from "@/lib/streak";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function StreakBadge({ interviewDates }: { interviewDates: string[] }) {
  const [open, setOpen] = useState(false);
  const { current, practiceDays } = computeStreak(interviewDates);
  const days = lastNDays(28);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-paper-raised px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ease-out-snap hover:border-ink-faint hover:-translate-y-0.5 hover:shadow-sm"
      >
        <span aria-hidden="true">{current > 0 ? "🔥" : "〇"}</span>
        {current > 0 ? `${current}-day streak` : "Start a streak"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-accent mb-1">Practice streak</p>
              <h2 className="text-lg font-semibold">
                {current > 0 ? `${current} day${current === 1 ? "" : "s"} in a row` : "No active streak"}
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-ink-faint hover:text-ink transition-colors shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-ink-soft leading-relaxed">
            {current > 0
              ? "Come back tomorrow and start an interview to keep it going."
              : "Start an interview today to begin a new streak."}
          </p>

          <div>
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAY_LABELS.map((d, i) => (
                <span key={i} className="text-center text-xs font-mono text-ink-faint">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day, i) => {
                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const practiced = practiceDays.has(key);
                const isToday = i === days.length - 1;
                return (
                  <div
                    key={key}
                    title={day.toLocaleDateString()}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-mono transition-all duration-200 ease-out-snap ${
                      practiced
                        ? "bg-accent text-accent-ink"
                        : "bg-border text-ink-faint"
                    } ${isToday ? "ring-2 ring-accent ring-offset-1 ring-offset-paper-raised" : ""}`}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
