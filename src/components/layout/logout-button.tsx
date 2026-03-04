"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

type LogoutButtonProps = {
  className?: string;
};

const DEFAULT_CLASS =
  "relative inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white transition hover:border-cyan-400/20 hover:bg-white/[0.05]";

export function LogoutButton({ className }: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className ?? DEFAULT_CLASS}
    >
      <LogOut className="h-4 w-4 text-white/80" />
      <span>Déconnexion</span>
    </button>
  );
}