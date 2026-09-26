"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

export function AccountMenu() {
  const { token, logout } = useAuth();
  const { showToast, clearToasts } = useToast();
  const router = useRouter();

  if (!token) return null;

  const handleLogout = () => {
    logout();
    clearToasts();
    showToast("Logged out", "info");
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed bottom-5 left-5 z-40 rounded-md border border-border bg-paper-raised px-3.5 py-1.5 text-sm font-medium text-ink-soft shadow-sm transition-all duration-200 ease-out-snap hover:text-ink hover:border-ink-faint hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
    >
      Log out
    </button>
  );
}
