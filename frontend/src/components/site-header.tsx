"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { HowItWorksModal } from "@/components/how-it-works-modal";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", authOnly: true },
  { href: "/interviews", label: "Interviews", authOnly: true },
  { href: "/resume", label: "Resumes", authOnly: true },
  { href: "/resources", label: "Guide", authOnly: false },
];

export function SiteHeader() {
  const { user, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-paper-raised relative z-20">
      <div className="flex items-center gap-6">
        <Link href={token ? "/dashboard" : "/"} className="flex items-baseline gap-0.5 font-semibold text-lg tracking-tight">
          <span className="text-ink">Interview</span>
          <span className="font-mono text-accent">IQ</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5">
          {NAV_LINKS.filter((link) => !link.authOnly || token).map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm py-1 transition-colors after:absolute after:left-0 after:-bottom-[17px] after:h-[2px] after:w-full after:origin-left after:bg-accent after:transition-transform after:duration-200 after:ease-out-snap ${
                  isActive
                    ? "text-ink font-medium after:scale-x-100"
                    : "text-ink-soft hover:text-ink after:scale-x-0"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => setHowItWorksOpen(true)}
            className="text-sm text-ink-soft hover:text-ink transition-colors"
          >
            How it works
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Switch to the other color theme"
          className="rounded-md border border-border w-9 h-9 flex items-center justify-center text-ink-soft hover:text-ink hover:border-ink-faint active:scale-90 transition-all"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="animate-scale-in">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 1.2v1.6M8 13.2v1.6M14.8 8h-1.6M2.8 8H1.2M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4 3.3 3.3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="animate-scale-in">
              <path
                d="M13.5 9.8A6 6 0 0 1 6.2 2.5a6 6 0 1 0 7.3 7.3Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        {token && user ? (
          <span className="hidden sm:inline text-sm text-ink-soft">{user.name}</span>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors px-2"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="btn-sheen rounded-md bg-accent text-accent-ink px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out-snap hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98]"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
      <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </header>
  );
}
