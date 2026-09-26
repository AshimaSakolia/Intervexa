"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Resume, parseAnalysis } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { buttonClassName } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { BackLink, BackLinkInline } from "@/components/back-link";
import { ConfirmModal } from "@/components/confirm-modal";

function ResumeCard({
  resume,
  onDelete,
}: {
  resume: Resume;
  onDelete: (id: number) => Promise<void>;
}) {
  const analysis = parseAnalysis(resume);
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(resume.id);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-paper-raised p-5 flex flex-col gap-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{resume.fileName}</p>
          <p className="text-xs text-ink-faint font-mono">
            uploaded {new Date(resume.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-accent font-medium hover:underline"
          >
            {expanded ? "Hide details" : "View details"}
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete resume"
            className="text-ink-faint hover:text-bad transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2.5 4h11M6 4V2.5h4V4M6.5 7v4M9.5 7v4M3.5 4l.7 8.5A1 1 0 0 0 5.2 13.5h5.6a1 1 0 0 0 1-0.9L12.5 4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {expanded && analysis && (
        <div className="flex flex-col gap-4 pt-3 border-t border-border">
          {analysis.skills.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.skills.map((s, i) => (
                  <span key={i} className="text-xs rounded-full bg-info-bg text-info px-2.5 py-1">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.technologies.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-1.5">
                Technologies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.technologies.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono rounded-full border border-border px-2.5 py-1 text-ink-soft"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.projects.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-1.5">
                Projects
              </p>
              <ul className="list-disc list-inside text-sm text-ink-soft">
                {analysis.projects.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.experience.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-1.5">
                Experience
              </p>
              <ul className="list-disc list-inside text-sm text-ink-soft">
                {analysis.experience.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {resume.claims.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-1.5">
                Resume claims
              </p>
              <ul className="flex flex-col gap-2">
                {resume.claims.map((c) => (
                  <li key={c.id} className="text-sm rounded-md bg-paper border border-border p-3">
                    <div className="flex justify-between gap-2">
                      <span>{c.text}</span>
                      {c.confidence !== null && (
                        <span className="shrink-0 font-mono tabular-nums text-ink-soft text-xs">
                          {c.confidence}/100
                        </span>
                      )}
                    </div>
                    {c.notes && <p className="text-ink-faint text-xs mt-1">{c.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        confirming={deleting}
        title="Delete this resume?"
        description={`"${resume.fileName}" will be permanently removed. Past interviews based on it will keep their existing results.`}
      />
    </div>
  );
}

export default function ResumePage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const { showToast } = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    api
      .getResumes(token)
      .then(setResumes)
      .finally(() => setListLoading(false));
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setError(null);
    setUploading(true);
    try {
      const resume = await api.uploadResume(token, file);
      setResumes((prev) => [resume, ...prev]);
      showToast("Resume uploaded and analyzed", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteResume = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteResume(token, id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      showToast("Resume deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete resume", "error");
      throw err;
    }
  };

  if (loading || !token) {
    return null;
  }

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <BackLink href="/dashboard">Dashboard</BackLink>
      <div className="flex flex-col gap-2">
        <BackLinkInline href="/dashboard">Dashboard</BackLinkInline>
        <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
        <p className="text-sm text-ink-soft">
          Upload a resume to generate interviews and verify your claims.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-paper-raised p-6 flex flex-col gap-3">
        <label
          className={`cursor-pointer self-start inline-block ${buttonClassName(
            "primary",
            uploading ? "pointer-events-none" : ""
          )}`}
        >
          {uploading ? "Uploading…" : "Upload resume (PDF)"}
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {error && <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2">{error}</p>}
      </div>

      <section className="flex flex-col gap-3">
        {listLoading && (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        )}
        {!listLoading && resumes.length === 0 && (
          <p className="text-sm text-ink-soft">No resumes uploaded yet.</p>
        )}
        {resumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} onDelete={handleDeleteResume} />
        ))}
      </section>
    </main>
  );
}
