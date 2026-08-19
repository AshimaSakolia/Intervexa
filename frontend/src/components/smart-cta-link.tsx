"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function SmartCtaLink({
  loggedInHref,
  loggedOutHref,
  className,
  children,
}: {
  loggedInHref: string;
  loggedOutHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  return (
    <Link href={token ? loggedInHref : loggedOutHref} className={className}>
      {children}
    </Link>
  );
}
