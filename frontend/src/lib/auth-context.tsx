"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, ReactNode } from "react";
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

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode / blocked); session will not persist
  }
}

function parseUser(raw: string | null): ApiUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ApiUser) : null;
  } catch {
    return null;
  }
}

function getSnapshot(): string | null {
  return readStorage("accessToken");
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
    () => readStorage("user"),
    () => null
  );
  const mounted = useSyncExternalStore(subscribe, getMountedSnapshot, getServerMountedSnapshot);
  const user = useMemo(() => parseUser(storedUser), [storedUser]);
  const loading = !mounted;

  const login = (newToken: string, newUser: ApiUser) => {
    writeStorage("accessToken", newToken);
    writeStorage("user", JSON.stringify(newUser));
    notify();
  };

  const logout = () => {
    writeStorage("accessToken", null);
    writeStorage("user", null);
    notify();
  };

  const updateUser = (patch: Partial<ApiUser>) => {
    const current = parseUser(readStorage("user"));
    if (!current) return;
    writeStorage("user", JSON.stringify({ ...current, ...patch }));
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
