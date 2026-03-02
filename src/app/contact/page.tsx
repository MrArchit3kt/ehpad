export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { requireAuth } from "@/server/auth/session";
import { createContactRequest } from "@/server/contact/create-contact-request";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireAuth();

  if (!user) {
    redirect("/login");
  }

  const sp = (await searchParams) ?? {};
  const hasValidationError = sp.error === "validation";
  const hasServerError = sp.error === "server";
  const isSuccess = sp.success === "1";

  return (
    <SiteShell>
      <div className="grid gap-6">
        <div className="neon-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
            Contact
          </p>
          <h1 className="neon-title neon-gradient-text mt-3 text-3xl font-black">
            Contacter les admins
          </h1>
          <p className="neon-text-muted mt-4 max-w-3xl leading-7">
            Utilise ce formulaire pour faire une demande admin, signaler un joueur,
            remonter un bug ou proposer une amélioration du site.
          </p>
        </div>

        <div className="neon-card p-8">
          <form action={createContactRequest} className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Type de demande
              </label>
              <select name="type" defaultValue="ADMIN_REQUEST" className="w-full px-4 py-3">
                <option value="ADMIN_REQUEST">Demande aux admins</option>
                <option value="PLAYER_REPORT">Signalement de joueur</option>
                <option value="BUG">Bug du site</option>
                <option value="IMPROVEMENT">Amélioration du site</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Sujet
              </label>
              <input
                name="subject"
                type="text"
                required
                placeholder="Ex: Joueur toxique en session"
                className="w-full px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Message
              </label>
              <textarea
                name="message"
                rows={8}
                required
                placeholder="Explique clairement la situation..."
                className="w-full px-4 py-3"
              />
            </div>

            {hasValidationError ? (
              <p className="text-sm font-medium text-rose-400">
                Formulaire invalide. Vérifie les champs.
              </p>
            ) : null}

            {hasServerError ? (
              <p className="text-sm font-medium text-rose-400">
                Erreur serveur pendant l’envoi.
              </p>
            ) : null}

            {isSuccess ? (
              <p className="text-sm font-medium text-emerald-400">
                Demande envoyée aux admins avec succès.
              </p>
            ) : null}

            <div>
              <button type="submit" className="neon-button px-6 py-3">
                Envoyer la demande
              </button>
            </div>
          </form>
        </div>
      </div>
    </SiteShell>
  );
}