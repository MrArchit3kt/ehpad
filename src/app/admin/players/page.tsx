export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/lib/prisma";
import { addWarning } from "@/server/admin/add-warning";
import { revokeWarning } from "@/server/admin/revoke-warning";
import { liftBan } from "@/server/admin/lift-ban";
import { resetPlayerPassword } from "@/server/admin/reset-player-password";
import { toggleEhpadMember } from "@/server/admin/toggle-ehpad-member";
import { toggleUserRole } from "@/server/admin/toggle-user-role";

function formatDate(value: Date | null) {
  if (!value) return "Jamais";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getInactiveDays(lastSeenAt: Date | null) {
  if (!lastSeenAt) return null;

  const now = Date.now();
  const diff = now - new Date(lastSeenAt).getTime();

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "server":
      return "Erreur serveur pendant l’action demandée.";
    case "validation":
      return "Requête invalide.";
    case "password_validation":
      return "Le nouveau mot de passe est invalide (minimum 6 caractères).";
    case "player_not_found":
      return "Joueur introuvable.";
    case "forbidden":
      return "Tu n’as pas les droits pour effectuer cette action.";
    case "self_role":
      return "Tu ne peux pas modifier ton propre rôle.";
    case "super_admin_locked":
      return "Le rôle d’un super admin ne peut pas être modifié ici.";
    default:
      return null;
  }
}

function getWarningTypeLabel(type: string) {
  switch (type) {
    case "TOXICITY":
      return "Toxicité";
    case "ABSENCE":
      return "Absence";
    case "AFK":
      return "AFK";
    case "INSULT":
      return "Insulte";
    case "CHEATING_SUSPECT":
      return "Suspicion de cheat";
    case "TEAM_REFUSAL":
      return "Refus d’équipe";
    case "SPAM":
      return "Spam";
    case "OTHER":
      return "Autre";
    default:
      return type;
  }
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300";
    case "ADMIN":
      return "rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300";
    case "PLAYER":
      return "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75";
    default:
      return "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75";
  }
}

function getStatusBadgeClass(status: string) {
  if (status === "BANNED") {
    return "rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-300";
  }

  if (status === "ACTIVE") {
    return "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300";
  }

  return "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75";
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    warned?: string;
    banned?: string;
    revoked?: string;
    unbanned?: string;
    password_reset?: string;
    ehpad?: string;
    role_updated?: string;
  }>;
}) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const sp = (await searchParams) ?? {};
  const errorMessage = getErrorMessage(sp.error);
  const isWarned = sp.warned === "1";
  const isBanned = sp.banned === "1";
  const isRevoked = sp.revoked === "1";
  const isUnbanned = sp.unbanned === "1";
  const isPasswordReset = sp.password_reset === "1";
  const isEhpadEnabled = sp.ehpad === "1";
  const isEhpadDisabled = sp.ehpad === "0";
  const isRoleUpdated = sp.role_updated === "1";

  const players = await db.user.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      displayName: true,
      username: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastSeenAt: true,
      isEhpadMember: true,
      warningsReceived: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          type: true,
          message: true,
          status: true,
          createdAt: true,
          revokedAt: true,
          revokedReason: true,
        },
      },
    },
  });

  const rows = players.map((player) => {
    const inactiveDays = getInactiveDays(player.lastSeenAt);
    const totalWarnings = player.warningsReceived.length;
    const activeWarnings = player.warningsReceived.filter(
      (warning) => warning.status === "ACTIVE",
    ).length;

    const shouldAlert =
      inactiveDays !== null && inactiveDays >= 10 && player.status === "ACTIVE";

    return {
      id: player.id,
      displayName: player.displayName,
      username: player.username,
      email: player.email,
      role: player.role,
      status: player.status,
      createdAt: player.createdAt,
      lastSeenAt: player.lastSeenAt,
      isEhpadMember: player.isEhpadMember,
      inactiveDays,
      totalWarnings,
      activeWarnings,
      shouldAlert,
      warnings: player.warningsReceived,
    };
  });

  const alertCount = rows.filter((row) => row.shouldAlert).length;
  const ehpadCount = rows.filter((row) => row.isEhpadMember).length;

  return (
    <SiteShell>
      <div className="grid gap-6">
        <div className="neon-card p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
                Admin Players
              </p>
              <h2 className="neon-title neon-gradient-text mt-3 text-2xl font-black md:text-3xl">
                Suivi des joueurs
              </h2>
              <p className="neon-text-muted mt-4 max-w-3xl leading-7">
                Vue admin de l’activité, de l’inactivité, des membres EHPAD et de la modération des joueurs.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="neon-card-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                  Total joueurs
                </p>
                <p className="neon-title neon-gradient-text mt-1 text-xl font-black md:text-2xl">
                  {rows.length}
                </p>
              </div>

              <div className="neon-card-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
                  Membres EHPAD
                </p>
                <p className="mt-1 text-xl font-black text-white md:text-2xl">
                  {ehpadCount}
                </p>
              </div>

              <div className="neon-card-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300/75">
                  Alertes 10j+
                </p>
                <p className="mt-1 text-xl font-black text-white md:text-2xl">
                  {alertCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-rose-400">{errorMessage}</p>
          </div>
        ) : null}

        {isWarned ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-amber-300">
              Avertissement ajouté avec succès.
            </p>
          </div>
        ) : null}

        {isBanned ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-rose-400">
              Le joueur a atteint 5 avertissements actifs du même type et a été banni automatiquement.
            </p>
          </div>
        ) : null}

        {isRevoked ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-emerald-300">
              Avertissement révoqué avec succès.
            </p>
          </div>
        ) : null}

        {isUnbanned ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-emerald-300">
              Joueur débanni avec succès.
            </p>
          </div>
        ) : null}

        {isPasswordReset ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-cyan-300">
              Mot de passe du joueur mis à jour avec succès.
            </p>
          </div>
        ) : null}

        {isEhpadEnabled ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-emerald-300">
              Membre EHPAD activé avec succès.
            </p>
          </div>
        ) : null}

        {isEhpadDisabled ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-amber-300">
              Membre EHPAD désactivé avec succès.
            </p>
          </div>
        ) : null}

        {isRoleUpdated ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-cyan-300">
              Rôle du joueur mis à jour avec succès.
            </p>
          </div>
        ) : null}

        {alertCount > 0 ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-amber-300">
              Attention : {alertCount} joueur{alertCount > 1 ? "s" : ""} n’a / n’ont pas
              été vu{alertCount > 1 ? "s" : ""} depuis au moins 10 jours.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4">
          {rows.map((player) => (
            <details
              key={player.id}
              className="neon-card overflow-hidden p-0 group"
            >
              <summary className="list-none cursor-pointer p-5 md:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white md:text-xl">
                          {player.displayName}
                        </h3>

                        <span className="neon-badge">@{player.username}</span>

                        <span className={getRoleBadgeClass(player.role)}>
                          {player.role}
                        </span>

                        <span className={getStatusBadgeClass(player.status)}>
                          {player.status}
                        </span>

                        <span
                          className={
                            player.isEhpadMember
                              ? "rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"
                              : "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/70"
                          }
                        >
                          {player.isEhpadMember ? "Membre EHPAD" : "Externe"}
                        </span>

                        {player.shouldAlert ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                            Inactif 10j+
                          </span>
                        ) : null}
                      </div>

                      <p className="neon-text-muted mt-3 text-sm truncate">
                        {player.email}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="neon-card-soft min-w-[135px] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
                          Dernière connexion
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-white">
                          {formatDate(player.lastSeenAt)}
                        </p>
                      </div>

                      <div className="neon-card-soft min-w-[135px] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-300/75">
                          Inactivité
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-white">
                          {player.inactiveDays === null
                            ? "Jamais vu"
                            : `${player.inactiveDays} jour${player.inactiveDays > 1 ? "s" : ""}`}
                        </p>
                      </div>

                      <div className="neon-card-soft min-w-[135px] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                          Warnings
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-white">
                          {player.activeWarnings} actif{player.activeWarnings > 1 ? "s" : ""} / {player.totalWarnings}
                        </p>
                      </div>

                      <div className="neon-card-soft min-w-[135px] p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                            Détails
                          </p>
                          <p className="mt-1.5 text-sm font-semibold text-white">
                            Ouvrir
                          </p>
                        </div>

                        <span className="text-white/70 text-lg transition-transform duration-200 group-open:rotate-180">
                          ▼
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </summary>

              <div className="border-t border-white/8 px-5 pb-5 pt-5 md:px-6 md:pb-6">
                <div className="grid gap-4">
                  <div className="grid gap-4 xl:grid-cols-4">
                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                        Statut team EHPAD
                      </p>

                      <p className="neon-text-muted mt-2 text-sm leading-6">
                        Ce joueur est actuellement{" "}
                        <span className="font-semibold text-white">
                          {player.isEhpadMember ? "dans la team EHPAD" : "hors team EHPAD"}
                        </span>.
                      </p>

                      <form action={toggleEhpadMember} className="mt-3">
                        <input type="hidden" name="userId" value={player.id} />
                        <input
                          type="hidden"
                          name="nextValue"
                          value={player.isEhpadMember ? "false" : "true"}
                        />

                        <button
                          type="submit"
                          className={`w-full px-5 py-3 ${
                            player.isEhpadMember ? "neon-button-secondary" : "neon-button"
                          }`}
                        >
                          {player.isEhpadMember
                            ? "Retirer de la team"
                            : "Activer membre EHPAD"}
                        </button>
                      </form>
                    </div>

                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                        Rôle du joueur
                      </p>

                      <p className="neon-text-muted mt-2 text-sm leading-6">
                        Rôle actuel :{" "}
                        <span className="font-semibold text-white">{player.role}</span>
                      </p>

                      {player.role === "SUPER_ADMIN" ? (
                        <p className="mt-3 text-xs text-white/60">
                          Le rôle SUPER_ADMIN est verrouillé ici.
                        </p>
                      ) : admin.role === "SUPER_ADMIN" ? (
                        <form action={toggleUserRole} className="mt-3">
                          <input type="hidden" name="userId" value={player.id} />

                          <button
                            type="submit"
                            className={`w-full px-5 py-3 ${
                              player.role === "ADMIN"
                                ? "neon-button-secondary"
                                : "neon-button"
                            }`}
                          >
                            {player.role === "ADMIN"
                              ? "Retirer admin"
                              : "Passer en admin"}
                          </button>
                        </form>
                      ) : (
                        <p className="mt-3 text-xs text-white/60">
                          Seul un super admin peut modifier les rôles.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                        Réinitialiser le mot de passe
                      </p>

                      <p className="neon-text-muted mt-2 text-sm leading-6">
                        Définit un mot de passe temporaire.
                      </p>

                      <form
                        action={resetPlayerPassword}
                        className="mt-3 grid gap-3"
                      >
                        <input type="hidden" name="userId" value={player.id} />

                        <input
                          name="password"
                          type="password"
                          minLength={6}
                          required
                          placeholder="Nouveau mot de passe"
                          className="w-full px-4 py-3"
                        />

                        <button
                          type="submit"
                          className="neon-button-secondary w-full px-5 py-3"
                        >
                          Modifier le mot de passe
                        </button>
                      </form>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300/75">
                        Ajouter un avertissement
                      </p>

                      <form action={addWarning} className="mt-3 grid gap-3">
                        <input type="hidden" name="userId" value={player.id} />

                        <select
                          name="type"
                          defaultValue="TOXICITY"
                          className="w-full px-4 py-3"
                        >
                          <option value="TOXICITY">Toxicité</option>
                          <option value="ABSENCE">Absence</option>
                          <option value="AFK">AFK</option>
                          <option value="INSULT">Insulte</option>
                          <option value="CHEATING_SUSPECT">Suspicion de cheat</option>
                          <option value="TEAM_REFUSAL">Refus d’équipe</option>
                          <option value="SPAM">Spam</option>
                          <option value="OTHER">Autre</option>
                        </select>

                        <input
                          name="message"
                          type="text"
                          required
                          placeholder="Raison de l’avertissement"
                          className="w-full px-4 py-3"
                        />

                        <button type="submit" className="neon-button w-full px-5 py-3">
                          Avertir
                        </button>
                      </form>
                    </div>
                  </div>

                  {player.status === "BANNED" ? (
                    <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300/80">
                        Déban du joueur
                      </p>

                      <form
                        action={liftBan}
                        className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]"
                      >
                        <input type="hidden" name="userId" value={player.id} />

                        <input
                          name="reason"
                          type="text"
                          placeholder="Motif du déban (optionnel)"
                          className="w-full px-4 py-3"
                        />

                        <button type="submit" className="neon-button px-5 py-3">
                          Déban
                        </button>
                      </form>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                        Historique des avertissements
                      </p>
                      <span className="neon-badge">{player.totalWarnings} total</span>
                    </div>

                    {player.warnings.length === 0 ? (
                      <p className="neon-text-muted mt-4 text-sm">
                        Aucun avertissement pour ce joueur.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {player.warnings.map((warning) => (
                          <div
                            key={warning.id}
                            className="rounded-2xl border border-white/8 bg-black/20 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="neon-badge">
                                {getWarningTypeLabel(warning.type)}
                              </span>

                              <span
                                className={
                                  warning.status === "ACTIVE"
                                    ? "rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-300"
                                    : "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"
                                }
                              >
                                {warning.status}
                              </span>

                              <span className="text-xs text-white/50">
                                {formatDate(warning.createdAt)}
                              </span>
                            </div>

                            <p className="mt-3 text-sm text-white">{warning.message}</p>

                            {warning.status === "REVOKED" ? (
                              <div className="mt-3 text-xs text-emerald-300/80">
                                <p>Révoqué le : {formatDate(warning.revokedAt)}</p>
                                {warning.revokedReason ? (
                                  <p className="mt-1">Motif : {warning.revokedReason}</p>
                                ) : null}
                              </div>
                            ) : null}

                            {warning.status === "ACTIVE" ? (
                              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                                  Révoquer cet avertissement
                                </p>

                                <form
                                  action={revokeWarning}
                                  className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]"
                                >
                                  <input
                                    type="hidden"
                                    name="warningId"
                                    value={warning.id}
                                  />

                                  <input
                                    name="reason"
                                    type="text"
                                    placeholder="Motif de révocation (optionnel)"
                                    className="w-full px-4 py-3"
                                  />

                                  <button
                                    type="submit"
                                    className="neon-button-secondary px-5 py-3"
                                  >
                                    Révoquer
                                  </button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}