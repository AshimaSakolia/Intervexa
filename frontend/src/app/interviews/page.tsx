"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Interview, InterviewType, parseCategoryScores } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/skeleton";
import { BackLink } from "@/components/back-link";

const INTERVIEW_TYPES: InterviewType[] = ["TECHNICAL", "HR", "BEHAVIORAL", "PROJECT", "SYSTEM_DESIGN"];
const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

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

export default function InterviewsPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<InterviewType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number] | "ALL">("ALL");

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
  }, [token]);

  const filtered = useMemo(() => {
    return interviews
      .filter((i) => typeFilter === "ALL" || i.interviewType === typeFilter)
      .filter((i) => statusFilter === "ALL" || i.status === statusFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [interviews, typeFilter, statusFilter]);

  if (loading || !token) {
    return null;
  }

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink href="/dashboard">Dashboard</BackLink>
        <h1 className="text-2xl font-semibold tracking-tight">All interviews</h1>
        <p className="text-sm text-ink-soft">{interviews.length} total</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as InterviewType | "ALL")}
          className="rounded-md border border-border bg-paper text-ink px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
        >
          <option value="ALL">All types</option>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUSES)[number] | "ALL")}
          className="rounded-md border border-border bg-paper text-ink px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {listLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {listError && <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2">{listError}</p>}

      {!listLoading && filtered.length === 0 && (
        <p className="text-sm text-ink-soft">No interviews match these filters.</p>
      )}

      <ul className="flex flex-col gap-2">
        {filtered.map((interview, i) => {
          const categoryScores = parseCategoryScores(interview.report);
          return (
            <li
              key={interview.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
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
    </main>
  );
}
