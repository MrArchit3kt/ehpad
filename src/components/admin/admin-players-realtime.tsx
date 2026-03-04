"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function AdminPlayersRealtime({
  channel,
}: {
  channel: string;
}) {
  const router = useRouter();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/admin/live?channel=${encodeURIComponent(channel)}`,
    );

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 150);
    };

    const onInvalidate = () => {
      scheduleRefresh();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data === "ping") {
        return;
      }

      scheduleRefresh();
    };

    eventSource.addEventListener("invalidate", onInvalidate as EventListener);
    eventSource.onmessage = onMessage;

    eventSource.onerror = () => {
      // Le navigateur tente automatiquement de se reconnecter.
    };

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      eventSource.removeEventListener(
        "invalidate",
        onInvalidate as EventListener,
      );
      eventSource.close();
    };
  }, [channel, router]);

  return null;
}