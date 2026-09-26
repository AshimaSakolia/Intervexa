"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AUTH_EXPIRED_EVENT } from "./api";
import type { ApiUser } from "./api";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: ApiUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<ApiUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((callback) => callback());
}

function getSnapshot(): string | null {
  return localStorage.getItem("accessToken");
}

function getServerSnapshot(): string | null {
  return null;
}

function getMountedSnapshot(): boolean {
  return true;
}

function getServerMountedSnapshot(): boolean {
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const storedUser = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("user"),
    () => null
  );
  const mounted = useSyncExternalStore(subscribe, getMountedSnapshot, getServerMountedSnapshot);
  const user: ApiUser | null = storedUser ? JSON.parse(storedUser) : null;
  const loading = !mounted;

  const login = (newToken: string, newUser: ApiUser) => {
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    notify();
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    notify();
  };

  const updateUser = (patch: Partial<ApiUser>) => {
    const current = localStorage.getItem("user");
    if (!current) return;
    const merged = { ...JSON.parse(current), ...patch };
    localStorage.setItem("user", JSON.stringify(merged));
    notify();
  };

  useEffect(() => {
    const handleExpired = () => {
      logout();
      router.push("/login");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
