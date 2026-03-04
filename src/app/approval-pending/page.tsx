export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSessionUser } from "@/server/auth/session";

export default async function ApprovalPendingPage() {
  const user = await getSessionUser();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="neon-card p-8 md:p-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="neon-badge">Inscription</span>
            <span className="neon-badge">Validation admin</span>
          </div>

          <h1 className="neon-title neon-gradient-text text-3xl font-black md:text-4xl">
            Demande en cours de validation
          </h1>

          <p className="neon-text-muted mt-5 text-sm leading-7 md:text-base">
            Votre demande d’inscription est en cours de validation par un admin.
            Une fois votre compte approuvé, vous pourrez accéder au site.
          </p>

          {user ? (
            <p className="mt-4 text-sm text-amber-300">
              Ton compte est déjà connecté. Si tu vois encore cette page, un admin
              doit finaliser la validation de ton accès.
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="neon-button px-6 py-3">
              Retour à la connexion
            </Link>

            <Link href="/" className="neon-button-secondary px-6 py-3">
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}