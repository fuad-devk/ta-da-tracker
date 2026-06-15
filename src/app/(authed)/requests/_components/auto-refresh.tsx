"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently refreshes the current Server Component data on an interval. */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
