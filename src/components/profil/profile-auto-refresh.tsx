"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ProfileAutoRefreshProps = {
  intervalMs?: number;
};

export function ProfileAutoRefresh({ intervalMs = 5000 }: ProfileAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let timer: number | undefined;

    const start = () => {
      stop();
      timer = window.setInterval(() => {
        // Re-fetch les Server Components de la page (donc DB re-lue)
        router.refresh();
      }, intervalMs);
    };

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const onVisibilityChange = () => {
      // Si l’utilisateur revient sur l’onglet, refresh immédiat
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    // Start au montage
    start();

    // Refresh immédiat aussi (utile si la page vient d’être ouverte)
    router.refresh();

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [router, intervalMs]);

  return null;
}