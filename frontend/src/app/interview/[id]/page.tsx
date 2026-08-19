"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Interview, Question } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { Spinner } from "@/components/spinner";
import { BackLink } from "@/components/back-link";

const PERFORMANCE_STYLES: Record<string, string> = {
  STRONG: "bg-good-bg text-good",
  WEAK: "bg-warn-bg text-warn",
  INCORRECT: "bg-bad-bg text-bad",
  INTERESTING: "bg-info-bg text-info",
  AVERAGE: "bg-border text-ink-soft",
};

function AnsweredQuestionCard({ question, index }: { question: Question; index: number }) {
  const answer = question.answer!;
  return (
    <li className="rounded-lg border border-border bg-paper-raised p-4 flex flex-col gap-3 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          <span className="font-mono text-ink-faint mr-1.5">{String(index + 1).padStart(2, "0")}</span>
          {question.text}
        </p>
        {answer.performanceLabel && (
          <span
            className={`shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium font-mono tracking-wide ${
              PERFORMANCE_STYLES[answer.performanceLabel] || ""
            }`}
          >
            {answer.performanceLabel}
          </span>
        )}
      </div>
      {question.askedBecause && (
        <p className="text-xs italic text-ink-faint">{question.askedBecause}</p>
      )}
      <div className="flex flex-col gap-2 rounded-md bg-paper p-3 border border-border">
        <p className="text-sm whitespace-pre-wrap">{answer.text}</p>
        {answer.score !== null && (
          <p className="text-sm font-semibold font-mono tabular-nums">Score: {answer.score}/100</p>
        )}
        {answer.feedback && <p className="text-sm text-ink-soft">{answer.feedback}</p>}
      </div>
    </li>
  );
}

function ActiveQuestionForm({
  question,
  token,
  interviewId,
  onSubmitted,
}: {
  question: Question;
  token: string;
  interviewId: string;
  onSubmitted: (answer: Question["answer"], nextQuestion: Question | null) => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"evaluating" | "adapting">("evaluating");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setStage("evaluating");
    const stageTimer = setTimeout(() => setStage("adapting"), 1800);
    try {
      const result = await api.submitAnswer(token, interviewId, question.id, text);
      onSubmitted(result.answer, result.nextQuestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      clearTimeout(stageTimer);
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-paper-raised p-6 flex flex-col gap-4 animate-scale-in">
      <div className="flex items-center gap-2 flex-wrap">
        {question.topic && (
          <span className="text-xs font-mono rounded-full bg-info-bg text-info px-2.5 py-0.5">
            {question.topic}
          </span>
        )}
        {question.difficulty && (
          <span className="text-xs font-mono uppercase tracking-wide rounded-full border border-border text-ink-faint px-2.5 py-0.5">
            {question.difficulty}
          </span>
        )}
      </div>
      <p className="text-lg font-medium leading-snug text-balance">{question.text}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          required
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer…"
          className="rounded-md border border-border bg-paper px-3 py-2 outline-none focus:border-accent transition-colors"
        />
        {error && (
          <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2 animate-fade-in-up">{error}</p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner light />
                {stage === "evaluating" ? "Evaluating…" : "Adapting next question…"}
              </span>
            ) : (
              "Submit answer"
            )}
          </Button>
          {submitting && stage === "adapting" && (
            <span className="text-xs text-ink-faint font-mono animate-fade-in-up">
              choosing difficulty based on your answer
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, loading } = useAuth();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api
      .getInterview(token, params.id)
      .then((data) => {
        if (data.report) {
          router.replace(`/interview/${params.id}/report`);
          return;
        }
        setInterview(data);
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load interview"));
  }, [token, params.id, router]);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnswerSubmitted = (
    answer: Question["answer"],
    nextQuestion: Question | null
  ) => {
    setInterview((prev) => {
      if (!prev) return prev;
      const updatedQuestions = prev.questions.map((q) =>
        q.id === answer?.questionId ? { ...q, answer } : q
      );
      return {
        ...prev,
        questions: nextQuestion ? [...updatedQuestions, nextQuestion] : updatedQuestions,
      };
    });
  };

  const handleComplete = async () => {
    if (!token) return;
    setCompleteError(null);
    setCompleting(true);
    try {
      await api.completeInterview(token, params.id);
      router.replace(`/interview/${params.id}/report`);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Failed to complete interview");
      setCompleting(false);
    }
  };

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
        <Skeleton className="h-40 w-full rounded-lg" />
      </main>
    );
  }

  const sortedQuestions = [...interview.questions].sort((a, b) => a.order - b.order);
  const answeredQuestions = sortedQuestions.filter((q) => q.answer);
  const activeQuestion = sortedQuestions.find((q) => !q.answer);

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackLink href="/dashboard">Dashboard</BackLink>
        <h1 className="text-2xl font-semibold tracking-tight">{interview.targetRole}</h1>
        <p className="text-sm text-ink-faint font-mono">
          {interview.interviewType.replace("_", " ")} &middot; {interview.difficulty} &middot;{" "}
          {new Date(interview.createdAt).toLocaleString()}
        </p>
        <div className="flex items-center gap-2 pt-1">
          {sortedQuestions.map((q) => (
            <div
              key={q.id}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${q.answer ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      {answeredQuestions.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-mono uppercase tracking-wide text-ink-faint">
            Previous questions
          </h2>
          <ul className="flex flex-col gap-4">
            {answeredQuestions.map((q, i) => (
              <AnsweredQuestionCard key={q.id} question={q} index={i} />
            ))}
          </ul>
        </section>
      )}

      {activeQuestion ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-mono uppercase tracking-wide text-ink-faint">
            Question {activeQuestion.order} of {interview.maxQuestions}
          </h2>
          <ActiveQuestionForm
            key={activeQuestion.id}
            question={activeQuestion}
            token={token}
            interviewId={params.id}
            onSubmitted={handleAnswerSubmitted}
          />
        </section>
      ) : (
        <div className="flex flex-col gap-2 animate-fade-in-up">
          {completeError && (
            <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2 inline-block animate-fade-in-up">
              {completeError}
            </p>
          )}
          <Button onClick={handleComplete} disabled={completing} className="self-start">
            {completing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner light />
                Generating report…
              </span>
            ) : (
              "Complete interview & get report"
            )}
          </Button>
          {completing && (
            <p className="text-xs text-ink-faint">
              This can take up to 30 seconds — generating your evaluation report and learning plan.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
