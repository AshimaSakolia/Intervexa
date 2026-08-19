"use client";

import { createContext, useContext, useSyncExternalStore, ReactNode } from "react";
import type { ApiUser } from "./api";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: ApiUser) => void;
  logout: () => void;
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
