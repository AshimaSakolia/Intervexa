"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving: boolean;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-good-bg text-good border-good/20",
  error: "bg-bad-bg text-bad border-bad/20",
  info: "bg-info-bg text-info border-info/20",
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const TOAST_DURATION_MS = 3500;
const TOAST_EXIT_MS = 180;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const generationRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const generation = generationRef.current;
    setToasts((prev) => {
      if (prev.some((t) => t.message === message && t.variant === variant && !t.leaving)) {
        return prev;
      }
      const id = nextId++;
      setTimeout(() => {
        if (generationRef.current !== generation) return;
        setToasts((cur) => cur.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => {
          if (generationRef.current !== generation) return;
          setToasts((cur) => cur.filter((t) => t.id !== id));
        }, TOAST_EXIT_MS);
      }, TOAST_DURATION_MS);
      return [...prev, { id, message, variant, leaving: false }];
    });
  }, []);

  const clearToasts = useCallback(() => {
    generationRef.current += 1;
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, clearToasts }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${toast.leaving ? "animate-fade-out-down" : "animate-fade-in-up"} flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium shadow-sm max-w-sm ${VARIANT_STYLES[toast.variant]}`}
          >
            <span aria-hidden="true">{VARIANT_ICONS[toast.variant]}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
