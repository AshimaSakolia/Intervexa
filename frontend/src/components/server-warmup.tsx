"use client";

import { useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Free-tier hosts (Render, Neon) sleep when idle. Pinging /health as soon as
 * any page loads wakes the API and database while the user is still reading
 * or filling in the form, so signup/login don't pay the cold-start cost.
 */
export function ServerWarmup() {
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`, { cache: "no-store" }).catch(() => {});
  }, []);
  return null;
}
