"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RevealOnScroll } from "@/components/reveal-on-scroll";

const SAMPLE_CATEGORIES = [
  { label: "Technical correctness", value: 85, color: "#8a7dff" },
  { label: "Technical depth", value: 60, color: "#5fd499" },
  { label: "Communication", value: 80, color: "#f0b34e" },
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
      <section className="hero-dark relative overflow-hidden">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-grid-overlay" aria-hidden="true" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
          <div className="flex flex-col gap-6">
            <p
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-accent animate-fade-in-up"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-accent"
                style={{ boxShadow: "0 0 12px 2px color-mix(in srgb, var(--accent) 80%, transparent)" }}
              />
              Adaptive AI mock interviews
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05] animate-fade-in-up"
              style={{ animationDelay: "60ms" }}
            >
              Interviews that read your{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #8a7dff, #c2b8ff)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                resume
              </span>{" "}
              and think on their feet.
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
                className="btn-sheen inline-block rounded-md bg-accent text-accent-ink px-6 py-3 font-medium shadow-md shadow-accent/30 hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out-snap"
              >
                Start practicing
              </Link>
              <span className="text-sm text-ink-faint">No credit card. Free to try.</span>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[28px] opacity-70"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(138,125,255,0.35), transparent 60%), radial-gradient(circle at 80% 80%, rgba(95,212,153,0.2), transparent 55%)",
                filter: "blur(28px)",
              }}
              aria-hidden="true"
            />

            <div
              className="hidden lg:flex absolute -left-10 -bottom-8 z-0 w-44 rounded-lg border border-border bg-paper-raised/90 backdrop-blur-sm p-4 flex-col gap-2 shadow-xl shadow-black/30 animate-fade-in-up"
              style={{ animationDelay: "320ms" }}
            >
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                Overall score
              </span>
              <span className="text-2xl font-mono font-semibold tabular-nums" style={{ color: "#5fd499" }}>
                85
                <span className="text-ink-faint text-xs">/100</span>
              </span>
              <span className="text-[11px] text-ink-faint">Full stack developer · Technical</span>
            </div>

            <div className="hero-float-card relative z-10 rounded-xl border border-border bg-paper-raised shadow-2xl shadow-black/40 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-paper/60">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-bad/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warn/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-good/70" />
                </div>
                <div className="flex-1 rounded-md bg-paper px-3 py-1 text-[11px] font-mono text-ink-faint text-center truncate">
                  interviewiq.app/interview/6
                </div>
              </div>

              <div className="p-6 flex flex-col gap-5">
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
                          className="h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{ width: barsFilled ? `${c.value}%` : "0%", background: c.color }}
                        />
                      </div>
                      <span className="font-mono text-xs text-ink-faint w-8 text-right tabular-nums">
                        {c.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-24">
        <RevealOnScroll className="flex flex-col gap-2 mb-10 text-center sm:text-left">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            One interview, three things checked
          </h2>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border">
          <RevealOnScroll
            className="bg-paper-raised p-6 flex flex-col gap-2 transition-all duration-200 ease-out-snap hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5 hover:z-10"
            delayMs={0}
          >
            <span className="font-mono text-xs text-ink-faint">adaptive</span>
            <p className="font-semibold">Question flow that reacts</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              Each answer is scored on the spot, and the next question is
              chosen based on how you performed — no fixed script.
            </p>
          </RevealOnScroll>
          <RevealOnScroll
            className="bg-paper-raised p-6 flex flex-col gap-2 transition-all duration-200 ease-out-snap hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5 hover:z-10"
            delayMs={80}
          >
            <span className="font-mono text-xs text-ink-faint">verified</span>
            <p className="font-semibold">Resume claim verification</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              We pull specific claims from your resume and ask you to explain
              them — checking real understanding, not keyword matches.
            </p>
          </RevealOnScroll>
          <RevealOnScroll
            className="bg-paper-raised p-6 flex flex-col gap-2 transition-all duration-200 ease-out-snap hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5 hover:z-10"
            delayMs={160}
          >
            <span className="font-mono text-xs text-ink-faint">reported</span>
            <p className="font-semibold">Report + learning plan</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              Get category scores, missed concepts, and a study plan built
              from exactly where you fell short.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="hero-dark relative overflow-hidden border-t border-border">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-grid-overlay" aria-hidden="true" />
        <RevealOnScroll className="relative z-10 max-w-3xl mx-auto px-6 py-20 flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Ready to see how you&rsquo;d hold up?
          </h2>
          <p className="text-ink-soft max-w-md">
            Upload your resume and get your first adaptive interview in under
            two minutes.
          </p>
          <Link
            href={ctaHref}
            className="btn-sheen inline-block rounded-md bg-accent text-accent-ink px-6 py-3 font-medium shadow-md shadow-accent/30 hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out-snap"
          >
            Start practicing
          </Link>
        </RevealOnScroll>
      </section>
    </main>
  );
}
