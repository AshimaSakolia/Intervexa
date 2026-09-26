"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/button";
import { AuthBackdrop } from "@/components/auth-backdrop";

export default function LoginPage() {
  const router = useRouter();
  const { login, token, loading } = useAuth();
  const { showToast, clearToasts } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) {
      router.replace("/dashboard");
    }
  }, [loading, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.login(email, password);
      login(res.accessToken, res.user);
      clearToasts();
      showToast(`Welcome back, ${res.user.name}`, "success");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || token) {
    return null;
  }

  return (
    <main className="relative flex-1 flex items-center justify-center px-6 py-16 overflow-hidden">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 rounded-lg border border-border border-t-2 border-t-accent bg-paper-raised/95 backdrop-blur-sm p-8 shadow-lg shadow-accent/5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent mb-2">Welcome back</p>
          <h1 className="text-xl font-semibold">Log in</h1>
          <p className="text-sm text-ink-soft mt-1">Pick up where your last interview left off.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-border bg-paper px-3 py-2 outline-none transition-all duration-200 ease-out-snap focus:border-accent focus:shadow-sm focus:shadow-accent/10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-paper px-3 py-2 pr-16 outline-none transition-all duration-200 ease-out-snap focus:border-accent focus:shadow-sm focus:shadow-accent/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-ink-faint hover:text-ink transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-bad rounded-md bg-bad-bg px-3 py-2 animate-fade-in-up">{error}</p>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="text-sm text-ink-soft">
          No account?{" "}
          <Link href="/register" className="text-accent font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
