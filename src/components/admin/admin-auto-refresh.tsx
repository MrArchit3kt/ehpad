"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AdminAutoRefreshProps = {
  intervalMs?: number;
};

export function AdminAutoRefresh({
  intervalMs = 5000,
}: AdminAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [router, intervalMs]);

  return null;
}