"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login", "/register", "/access"];

export function PresenceHeartbeat() {
  const pathname = usePathname();
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (PUBLIC_PATHS.includes(pathname)) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const ping = async () => {
      if (cancelled || stoppedRef.current) {
        return;
      }

      try {
        const response = await fetch("/api/presence/ping", {
          method: "POST",
          cache: "no-store",
        });

        if (response.status === 401) {
          stoppedRef.current = true;
        }
      } catch (error) {
        console.error("PRESENCE_PING_ERROR", error);
      }
    };

    const leave = async () => {
      if (stoppedRef.current) {
        return;
      }

      try {
        const response = await fetch("/api/presence/leave", {
          method: "POST",
          keepalive: true,
          cache: "no-store",
        });

        if (response.status === 401) {
          stoppedRef.current = true;
        }
      } catch (error) {
        console.error("PRESENCE_LEAVE_ERROR", error);
      }
    };

    void ping();

    interval = setInterval(() => {
      void ping();
    }, 30000);

    const handleBeforeUnload = () => {
      void leave();
    };

    const handlePageHide = () => {
      void leave();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      cancelled = true;

      if (interval) {
        clearInterval(interval);
      }

      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);

      // IMPORTANT :
      // ne pas appeler leave() ici
      // sinon chaque navigation interne retire le joueur du pool
    };
  }, [pathname]);

  return null;
}