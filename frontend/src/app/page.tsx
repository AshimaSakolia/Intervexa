"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const SAMPLE_CATEGORIES = [
  { label: "Technical correctness", value: 85 },
  { label: "Technical depth", value: 60 },
  { label: "Communication", value: 80 },
];

export default function Home() {
  const { user, loading } = useAuth();
  const ctaHref = !loading && user ? "/dashboard" : "/register";
  const [barsFilled, setBarsFilled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBarsFilled(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex-1">
      <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
        <div className="flex flex-col gap-6">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent animate-fade-in-up">
            Adaptive mock interviews
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance leading-[1.08] animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            Practice interviews that read your resume and react to your answers.
          </h1>
          <p
            className="text-lg text-ink-soft max-w-md leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            Upload a resume, pick a role and difficulty, and get questions that
            adapt in real time — harder when you&rsquo;re strong, clarifying when
            you&rsquo;re not, and probing when a claim needs backing up.
          </p>
          <div
            className="flex items-center gap-4 pt-2 animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href={ctaHref}
              className="inline-block rounded-md bg-accent text-accent-ink px-6 py-3 font-medium hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Start practicing
            </Link>
            <span className="text-sm text-ink-faint">No credit card. Free to try.</span>
          </div>
        </div>

        <div
          className="rounded-lg border border-border bg-paper-raised p-6 flex flex-col gap-5 shadow-sm animate-scale-in"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
              Question 3 of 5 &middot; adapted
            </span>
            <span className="rounded-full bg-good-bg text-good text-xs font-medium px-2.5 py-0.5">
              STRONG
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            You mentioned decoupling long-running tasks with RabbitMQ — walk me
            through how you handled message retries and dead-letter queues.
          </p>
          <div className="flex flex-col gap-3 pt-1 border-t border-border">
            {SAMPLE_CATEGORIES.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="text-xs text-ink-soft w-40 shrink-0">{c.label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-[width] duration-700 ease-out"
                    style={{ width: barsFilled ? `${c.value}%` : "0%" }}
                  />
                </div>
                <span className="font-mono text-xs text-ink-faint w-8 text-right tabular-nums">
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border">
          <div className="bg-paper-raised p-6 flex flex-col gap-2 hover:bg-paper transition-colors">
            <span className="font-mono text-xs text-ink-faint">adaptive</span>
            <p className="font-semibold">Question flow that reacts</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              Each answer is scored on the spot, and the next question is
              chosen based on how you performed — no fixed script.
            </p>
          </div>
          <div className="bg-paper-raised p-6 flex flex-col gap-2 hover:bg-paper transition-colors">
            <span className="font-mono text-xs text-ink-faint">verified</span>
            <p className="font-semibold">Resume claim verification</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              We pull specific claims from your resume and ask you to explain
              them — checking real understanding, not keyword matches.
            </p>
          </div>
          <div className="bg-paper-raised p-6 flex flex-col gap-2 hover:bg-paper transition-colors">
            <span className="font-mono text-xs text-ink-faint">reported</span>
            <p className="font-semibold">Report + learning plan</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              Get category scores, missed concepts, and a study plan built
              from exactly where you fell short.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
