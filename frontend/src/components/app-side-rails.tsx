"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SideRail } from "@/components/side-rail";

const EXCLUDED_PREFIXES = ["/login", "/register"];

export function AppSideRails() {
  const pathname = usePathname();
  const { token } = useAuth();

  const isHomepage = pathname === "/";
  const isExcluded = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!token || isHomepage || isExcluded) return null;

  return (
    <>
      <SideRail side="left" />
      <SideRail side="right" />
    </>
  );
}
