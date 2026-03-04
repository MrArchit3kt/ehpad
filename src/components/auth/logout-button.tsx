"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await signOut({
            callbackUrl: "/login",
          });
        })
      }
      disabled={isPending}
      className="neon-button-secondary px-5 py-3 disabled:opacity-70"
    >
      {isPending ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}