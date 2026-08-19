import { SmartCtaLink } from "@/components/smart-cta-link";

interface QA {
  q: string;
  a: string;
}

interface Category {
  key: string;
  label: string;
  intro: string;
  questions: QA[];
}

const CATEGORIES: Category[] = [
  {
    key: "opening",
    label: "Opening the interview",
    intro:
      "The first few minutes set the tone. These come up in almost every interview, regardless of role.",
    questions: [
      {
        q: "How should I introduce myself?",
        a: "Keep it under 90 seconds: current role, one or two things you've built that are relevant to this job, and why you're interested in it. Skip your full history — the interviewer has your resume. End on something that invites a follow-up question, like a specific project.",
      },
      {
        q: "“Tell me about yourself” — what are they actually asking?",
        a: "Not your biography. They want a 30-second pitch: what you do, what you're good at, and why you're here. Structure it as present → relevant past → why this role, not birth-to-now.",
      },
      {
        q: "Why do you want to work here?",
        a: "Generic answers (“great culture”, “growth opportunities”) are forgettable. Reference something specific — a product decision, an engineering blog post, a problem the team is visibly solving — and connect it to what you want to work on next.",
      },
    ],
  },
  {
    key: "technical",
    label: "Technical",
    intro:
      "Expect a mix of fundamentals, system design, and questions about your own projects.",
    questions: [
      {
        q: "How deep should I go when explaining a project?",
        a: "Lead with the problem and constraint, not the tech stack. Then explain one specific decision you made and why — that's what shows real ownership, not a list of tools you used.",
      },
      {
        q: "What if I don't know the answer to a technical question?",
        a: "Say what you do know, reason out loud toward an answer, and be explicit about the gap (“I haven't worked with X directly, but based on how Y works, I'd expect...”). Interviewers weight reasoning process heavily — guessing silently or bluffing reads worse than an honest “I'm not sure, here's how I'd find out.”",
      },
      {
        q: "How do I prepare for system design questions?",
        a: "Practice narrating trade-offs out loud, not memorizing diagrams. Start from requirements and constraints, then build up — interviewers care more about how you navigate ambiguity than the final architecture.",
      },
    ],
  },
  {
    key: "behavioral",
    label: "Behavioral & HR",
    intro:
      "These test judgment and self-awareness more than any single “correct” answer.",
    questions: [
      {
        q: "What's a good structure for behavioral answers?",
        a: "Situation, task, action, result — but spend most of your time on the action. Interviewers are trying to isolate what you personally did, so “we decided” should quickly become “I proposed” or “I led.”",
      },
      {
        q: "How do I answer “what's your biggest weakness” honestly?",
        a: "Pick something real, not a disguised strength (“I work too hard”). Say what you've done about it — a weakness paired with a concrete corrective habit reads as self-aware, not disqualifying.",
      },
      {
        q: "How do I talk about a conflict with a teammate without sounding negative?",
        a: "Focus on the disagreement's substance (a technical or process decision), not the person. Explain how you resolved it and what you'd do differently — interviewers are listening for maturity, not who was “right.”",
      },
    ],
  },
  {
    key: "closing",
    label: "Closing the interview",
    intro: "The last few minutes are still part of the evaluation.",
    questions: [
      {
        q: "Should I always ask questions at the end?",
        a: "Yes — not asking anything reads as low interest. Ask something you couldn't have found on the company website: a recent technical decision, how the team measures success, or what's changed about the role in the last year.",
      },
      {
        q: "How do I answer salary expectations without underselling myself?",
        a: "Give a range based on real market data for the role and your experience, not a single number. If pressed early, it's fine to redirect: “I'd like to understand the full scope first, but based on my research the range is typically X–Y.”",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <main className="flex-1">
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent mb-3">
          Interview guide
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance leading-tight">
          Common interview questions, answered plainly
        </h1>
        <p className="text-ink-soft mt-4 leading-relaxed max-w-xl">
          A reference for the questions that come up again and again — what
          they&rsquo;re really testing for, and how to structure a strong answer.
          When you&rsquo;re ready to practice against questions built from your own
          resume,{" "}
          <SmartCtaLink
            loggedInHref="/dashboard"
            loggedOutHref="/register"
            className="text-accent font-medium hover:underline"
          >
            start an adaptive interview
          </SmartCtaLink>
          .
        </p>
      </section>

      <nav className="max-w-3xl mx-auto px-6 pb-8">
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <li key={c.key}>
              <a
                href={`#${c.key}`}
                className="inline-block text-xs font-mono uppercase tracking-wide rounded-full border border-border px-3 py-1.5 text-ink-soft hover:border-ink-faint hover:text-ink transition-colors"
              >
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pb-24 flex flex-col gap-14">
        {CATEGORIES.map((category) => (
          <section key={category.key} id={category.key} className="scroll-mt-20">
            <h2 className="text-xl font-semibold">{category.label}</h2>
            <p className="text-sm text-ink-soft mt-1.5 max-w-xl leading-relaxed">
              {category.intro}
            </p>
            <div className="flex flex-col gap-5 mt-6">
              {category.questions.map((qa, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-paper-raised p-5"
                >
                  <p className="font-medium leading-snug">{qa.q}</p>
                  <p className="text-sm text-ink-soft mt-2 leading-relaxed">{qa.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
