import { useEffect, useState } from "react";
import {
  Interview,
  parseCategoryScores,
  parseMissedConcepts,
  parseResumeClaimConfidence,
  parseLearningPlanTopics,
} from "@/lib/api";

export function ScoreRing({ value }: { value: number }) {
  const size = 84;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const color = value >= 75 ? "var(--good)" : value >= 50 ? "var(--warn)" : "var(--bad)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="animate-ring-draw"
          style={{ ["--ring-circumference" as string]: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono font-semibold text-lg tabular-nums animate-fade-in-up">
        {value}
      </div>
    </div>
  );
}

export function CategoryBar({
  label,
  value,
  delayMs = 0,
}: {
  label: string;
  value: number;
  delayMs?: number;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function ReportView({ interview }: { interview: Interview }) {
  const report = interview.report!;
  const categoryScores = parseCategoryScores(report);
  const missedConcepts = parseMissedConcepts(report);
  const claimConfidence = parseResumeClaimConfidence(report);
  const learningPlanTopics = parseLearningPlanTopics(interview.learningPlan);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-paper-raised p-6 flex flex-col gap-5 animate-fade-in-up">
        <div className="flex items-center gap-5">
          <ScoreRing value={report.overallScore} />
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-ink-faint">Overall score</p>
            <h2 className="text-lg font-semibold mt-0.5">Evaluation report</h2>
          </div>
        </div>

        {categoryScores && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <CategoryBar label="Technical correctness" value={categoryScores.technicalCorrectness} delayMs={0} />
            <CategoryBar label="Technical depth" value={categoryScores.technicalDepth} delayMs={60} />
            <CategoryBar label="Problem solving" value={categoryScores.problemSolving} delayMs={120} />
            <CategoryBar label="Communication" value={categoryScores.communication} delayMs={180} />
            <CategoryBar label="Resume understanding" value={categoryScores.resumeUnderstanding} delayMs={240} />
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="font-medium mb-1 text-sm">Summary</p>
          <p className="text-sm text-ink-soft leading-relaxed">{report.summary}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md bg-good-bg p-4 flex flex-col gap-1.5">
            <p className="font-medium text-sm text-good flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5 6.5 12 13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Strengths
            </p>
            <p className="text-sm text-ink-soft leading-relaxed">{report.strengths}</p>
          </div>
          <div className="rounded-md bg-bad-bg p-4 flex flex-col gap-1.5">
            <p className="font-medium text-sm text-bad flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Weaknesses
            </p>
            <p className="text-sm text-ink-soft leading-relaxed">{report.weaknesses}</p>
          </div>
        </div>

        {missedConcepts.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="font-medium mb-2 text-sm">Missed concepts</p>
            <ul className="flex flex-wrap gap-2">
              {missedConcepts.map((c, i) => (
                <li key={i} className="text-xs font-mono rounded-full bg-warn-bg text-warn px-2.5 py-1">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {claimConfidence.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="font-medium mb-2 text-sm">Resume claim confidence</p>
            <ul className="flex flex-col gap-2">
              {claimConfidence.map((c, i) => (
                <li key={i} className="text-sm rounded-md bg-paper border border-border p-3">
                  <div className="flex justify-between gap-2 font-medium">
                    <span>{c.claim}</span>
                    <span className="shrink-0 font-mono tabular-nums text-ink-soft">
                      {c.confidence}/100
                    </span>
                  </div>
                  <p className="text-ink-soft mt-1">{c.notes}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {report.motivation && (
        <section
          className="rounded-lg border-l-2 border-l-accent bg-info-bg p-5 animate-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-sm leading-relaxed">{report.motivation}</p>
        </section>
      )}

      {learningPlanTopics.length > 0 && (
        <section
          className="rounded-lg border border-border bg-paper-raised p-6 flex flex-col gap-4 animate-fade-in-up"
          style={{ animationDelay: "220ms" }}
        >
          <h2 className="text-lg font-semibold">Personalized learning plan</h2>
          <ul className="flex flex-col gap-5">
            {learningPlanTopics.map((t, i) => (
              <li key={i} className="flex flex-col gap-2 pb-5 border-b border-border last:border-0 last:pb-0">
                <p className="font-medium">{t.topic}</p>
                {t.subtopics.length > 0 && (
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wide text-ink-faint">Subtopics</p>
                    <ul className="list-disc list-inside text-sm text-ink-soft mt-1">
                      {t.subtopics.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.practiceQuestions.length > 0 && (
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wide text-ink-faint">
                      Practice questions
                    </p>
                    <ul className="list-disc list-inside text-sm text-ink-soft mt-1">
                      {t.practiceQuestions.map((q, j) => (
                        <li key={j}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {interview.learningPlan && (
            <div className="rounded-md bg-info-bg p-4">
              <p className="font-medium mb-1 text-sm text-info">Recommended next interview</p>
              <p className="text-sm text-ink-soft leading-relaxed">
                {interview.learningPlan.recommendedNextInterview}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
