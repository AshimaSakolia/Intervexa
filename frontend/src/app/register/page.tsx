"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/button";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.register(email, password, name);
      login(res.accessToken, res.user);
      showToast(`Welcome, ${res.user.name}`, "success");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-6 rounded-lg border border-border border-t-2 border-t-accent bg-paper-raised p-8 shadow-sm animate-fade-in-up">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent mb-2">Get started</p>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-ink-soft mt-1">Start practicing in under a minute.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border bg-paper px-3 py-2 outline-none focus:border-accent transition-colors"
            />
          </div>
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
              className="rounded-md border border-border bg-paper px-3 py-2 outline-none focus:border-accent transition-colors"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-paper px-3 py-2 pr-16 outline-none focus:border-accent transition-colors"
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
            {submitting ? "Creating account…" : "Register"}
          </Button>
        </form>
        <p className="text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
