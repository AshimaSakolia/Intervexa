"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Interview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ReportView } from "@/components/interview/report-view";
import { Skeleton } from "@/components/skeleton";
import { BackLink } from "@/components/back-link";

export default function InterviewReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, loading } = useAuth();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    api
      .getInterview(token, params.id)
      .then((data) => {
        if (!data.report) {
          router.replace(`/interview/${params.id}`);
          return;
        }
        setInterview(data);
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load report"));
  }, [token, params.id, router]);

  if (loading || !token) {
    return null;
  }

  if (fetchError) {
    return (
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2 inline-block">{fetchError}</p>
      </main>
    );
  }

  if (!interview) {
    return (
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackLink href="/interviews">All interviews</BackLink>
        <h1 className="text-2xl font-semibold tracking-tight">{interview.targetRole}</h1>
        <p className="text-sm text-ink-faint font-mono">
          {interview.interviewType.replace("_", " ")} &middot; {interview.difficulty} &middot;{" "}
          {new Date(interview.createdAt).toLocaleString()}
        </p>
      </div>

      <ReportView interview={interview} />
    </main>
  );
}
