"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  Interview,
  Resume,
  Difficulty,
  InterviewType,
  parseCategoryScores,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { InterviewRowSkeleton } from "@/components/skeleton";
import { Button } from "@/components/button";

const INTERVIEW_TYPES: InterviewType[] = ["TECHNICAL", "HR", "BEHAVIORAL", "PROJECT", "SYSTEM_DESIGN"];
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const RECENT_INTERVIEWS_LIMIT = 5;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warn-bg text-warn",
  IN_PROGRESS: "bg-info-bg text-info",
  COMPLETED: "bg-good-bg text-good",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium font-mono tracking-wide ${
        STATUS_STYLES[status] || "bg-border text-ink-faint"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const { showToast } = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("TECHNICAL");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    api
      .getInterviews(token)
      .then(setInterviews)
      .catch((err) => setListError(err instanceof Error ? err.message : "Failed to load interviews"))
      .finally(() => setListLoading(false));
    api
      .getResumes(token)
      .then((data) => {
        setResumes(data);
        if (data.length > 0) setSelectedResumeId(data[0].id);
      })
      .catch(() => {});
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedResumeId) {
      setFormError("Upload a resume first");
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      const interview = await api.createInterview(token, {
        resumeId: selectedResumeId,
        targetRole,
        interviewType,
        difficulty,
        maxQuestions,
      });
      showToast("Interview started", "success");
      router.push(`/interview/${interview.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to start interview");
      setCreating(false);
    }
  };

  if (loading || !token) {
    return null;
  }

  const completedInterviews = interviews.filter((i) => i.report);
  const averageScore = completedInterviews.length
    ? Math.round(
        completedInterviews.reduce((sum, i) => sum + (i.report?.overallScore ?? 0), 0) /
          completedInterviews.length
      )
    : null;
  const recentInterviews = [...interviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_INTERVIEWS_LIMIT);

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user ? `, ${user.name}` : ""}
        </h1>
      </div>

      {!listLoading && interviews.length > 0 && (
        <section className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-paper-raised overflow-hidden animate-fade-in-up">
          <div className="p-5 flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-wide text-ink-faint">
              Interviews
            </span>
            <span className="text-2xl font-mono font-semibold tabular-nums">
              {interviews.length}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-wide text-ink-faint">
              Completed
            </span>
            <span className="text-2xl font-mono font-semibold tabular-nums">
              {completedInterviews.length}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-wide text-ink-faint">
              Avg. score
            </span>
            <span className="text-2xl font-mono font-semibold tabular-nums">
              {averageScore !== null ? averageScore : "—"}
            </span>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-border bg-paper-raised p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold">Start new interview</h2>
          <p className="text-sm text-ink-soft mt-0.5">
            Pick a resume, a target role, and how you want to be tested.
          </p>
        </div>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="resume" className="text-sm font-medium">
                Resume
              </label>
              <Link href="/resume" className="text-xs text-accent font-medium hover:underline">
                Manage resumes
              </Link>
            </div>
            {resumes.length > 0 ? (
              <select
                id="resume"
                value={selectedResumeId ?? ""}
                onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border border-border bg-paper text-ink px-3 py-2 outline-none focus:border-accent transition-colors"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fileName} ({new Date(r.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <Link
                href="/resume"
                className="text-sm text-accent font-medium hover:underline rounded-md border border-dashed border-border px-3 py-2"
              >
                Upload a resume to get started →
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="targetRole" className="text-sm font-medium">
              Target role
            </label>
            <input
              id="targetRole"
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="rounded-md border border-border bg-paper px-3 py-2 outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="interviewType" className="text-sm font-medium">
                Interview type
              </label>
              <select
                id="interviewType"
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                className="rounded-md border border-border bg-paper text-ink px-3 py-2 outline-none focus:border-accent transition-colors"
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="difficulty" className="text-sm font-medium">
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="rounded-md border border-border bg-paper text-ink px-3 py-2 outline-none focus:border-accent transition-colors"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="maxQuestions" className="text-sm font-medium">
                Questions
              </label>
              <input
                id="maxQuestions"
                type="number"
                min={3}
                max={10}
                value={maxQuestions}
                onChange={(e) => setMaxQuestions(Number(e.target.value))}
                className="rounded-md border border-border bg-paper px-3 py-2 outline-none focus:border-accent transition-colors font-mono tabular-nums"
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2 animate-fade-in-up">{formError}</p>
          )}
          <Button type="submit" disabled={creating || resumes.length === 0} className="self-start">
            {creating ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-accent-ink/40 border-t-accent-ink animate-spin" />
                Starting…
              </span>
            ) : (
              "Start interview"
            )}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent interviews</h2>
          {interviews.length > 0 && (
            <Link href="/interviews" className="text-sm text-accent font-medium hover:underline">
              View all
            </Link>
          )}
        </div>

        {listLoading && (
          <div className="flex flex-col gap-2">
            <InterviewRowSkeleton />
            <InterviewRowSkeleton />
          </div>
        )}

        {listError && <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2">{listError}</p>}

        {!listLoading && interviews.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 flex flex-col items-center text-center gap-2 animate-fade-in-up">
            <div className="w-10 h-10 rounded-full bg-info-bg text-info flex items-center justify-center font-mono text-sm">
              0
            </div>
            <p className="text-sm font-medium">No interviews yet</p>
            <p className="text-sm text-ink-soft max-w-xs">
              Upload a resume above and start your first adaptive interview.
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {recentInterviews.map((interview, i) => {
            const categoryScores = parseCategoryScores(interview.report);
            return (
              <li
                key={interview.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <button
                  onClick={() =>
                    router.push(
                      interview.report ? `/interview/${interview.id}/report` : `/interview/${interview.id}`
                    )
                  }
                  className="w-full text-left flex items-center justify-between gap-4 rounded-lg border border-border bg-paper-raised px-4 py-3 hover:border-ink-faint hover:-translate-y-px hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      {interview.targetRole}{" "}
                      <span className="text-ink-faint font-normal font-mono text-xs uppercase tracking-wide">
                        {interview.interviewType.replace("_", " ")} / {interview.difficulty}
                      </span>
                    </span>
                    <span className="text-xs text-ink-faint">
                      {new Date(interview.createdAt).toLocaleString()}
                    </span>
                    {categoryScores && (
                      <span className="text-xs text-ink-soft font-mono tabular-nums">
                        correctness {categoryScores.technicalCorrectness} &middot; depth{" "}
                        {categoryScores.technicalDepth} &middot; communication{" "}
                        {categoryScores.communication}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {interview.report && (
                      <span className="font-mono font-semibold tabular-nums">
                        {interview.report.overallScore}
                        <span className="text-ink-faint text-sm">/100</span>
                      </span>
                    )}
                    <StatusBadge status={interview.status} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
