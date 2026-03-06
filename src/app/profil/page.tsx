export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ProfileAutoRefresh } from "@/components/profil/profile-auto-refresh";
import { requireAuth } from "@/server/auth/session";
import { db } from "@/lib/prisma";
import { updateProfile } from "@/server/profil/update-profile";
import { toggleMixAvailability } from "@/server/mix/toggle-mix-availability";

function getErrorMessage(error?: string) {
  switch (error) {
    case "validation":
      return "Le formulaire est invalide. Vérifie les champs.";
    case "server":
      return "Erreur serveur pendant la sauvegarde. Réessaie.";
    case "banned":
      return "Compte banni. Action impossible.";
    default:
      return null;
  }
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const sessionUser = await requireAuth();

  if (!sessionUser) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    redirect("/login");
  }

  const latestTeamMember = await db.teamMember.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      addedAt: "desc",
    },
    include: {
      team: {
        include: {
          session: true,
          members: {
            orderBy: {
              addedAt: "asc",
            },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  warzoneUsername: true,
                  platform: true,
                },
              },
              tempPlayer: {
                select: {
                  id: true,
                  nickname: true,
                  note: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const currentTeam = latestTeamMember?.team ?? null;

  const sp = (await searchParams) ?? {};
  const errorMessage = getErrorMessage(sp.error);
  const isSuccess = sp.success === "1";

  return (
    <SiteShell>
      {/* Auto refresh DB -> la team apparaît sans refresh manuel */}
      <ProfileAutoRefresh intervalMs={5000} />

      <div className="grid gap-6">
        <div className="neon-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
            Profil
          </p>
          <h2 className="neon-title neon-gradient-text mt-3 text-3xl font-black">
            Mon profil joueur
          </h2>
          <p className="neon-text-muted mt-4 max-w-3xl leading-7">
            Configure tes informations de jeu, gère ta présence dans le pool de
            mix et consulte ta dernière équipe assignée.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
              Statut de participation
            </p>

            <h3 className="mt-3 text-2xl font-bold text-white">
              {user.isAvailableForMix ? "En file de combat" : "Hors file de combat"}
            </h3>

            <p className="neon-text-muted mt-3 text-sm leading-6">
              {user.isAvailableForMix
                ? "Tu es actuellement visible dans le pool de mix des admins."
                : "Active ce statut pour apparaître dans le pool de mix des admins."}
            </p>

            <div className="mt-4">
              <span
                className={
                  user.isAvailableForMix
                    ? "inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"
                    : "inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/70"
                }
              >
                {user.isAvailableForMix ? "Prêt au déploiement" : "En attente"}
              </span>
            </div>

            <form action={toggleMixAvailability} className="mt-5">
              <button
                type="submit"
                className={`w-full px-4 py-3 ${
                  user.isAvailableForMix ? "neon-button-secondary" : "neon-button"
                }`}
              >
                {user.isAvailableForMix
                  ? "Quitter la file de combat"
                  : "Entrer dans la file de combat"}
              </button>
            </form>

            <p className="neon-text-muted mt-4 text-xs leading-6">
              Tu restes dans la file tant que tu ne te retires pas manuellement ou
              que tu ne te déconnectes pas.
            </p>
          </div>

          <div className="neon-card p-6 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
              Mon équipe actuelle
            </p>

            {currentTeam ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold text-white">
                    Team {currentTeam.teamNumber}
                  </h3>

                  <span className="neon-badge">
                    Session {currentTeam.session.id.slice(-6).toUpperCase()}
                  </span>

                  <span className="neon-badge">
                    {currentTeam.members.length} joueur
                    {currentTeam.members.length > 1 ? "s" : ""}
                  </span>
                </div>

                <p className="neon-text-muted mt-4 text-sm leading-6">
                  Voici ta dernière escouade générée. Tu peux retrouver ici tes
                  coéquipiers actuels.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {currentTeam.members.map((member) => {
                    const memberName =
                      member.user?.displayName ??
                      member.tempPlayer?.nickname ??
                      "Joueur inconnu";

                    const memberSecondary =
                      member.user?.username
                        ? `@${member.user.username}`
                        : "Joueur temporaire";

                    const memberWarzone =
                      member.user?.warzoneUsername ??
                      member.tempPlayer?.nickname ??
                      "Non renseigné";

                    const memberPlatform =
                      member.user?.platform ?? "Temporaire";

                    return (
                      <div key={member.id} className="neon-card-soft p-4">
                        <p className="font-semibold text-white">{memberName}</p>

                        <p className="neon-text-muted mt-1 text-sm">
                          {memberSecondary}
                        </p>

                        <p className="neon-text-muted mt-2 text-sm">
                          Warzone :{" "}
                          <span className="text-white">{memberWarzone}</span>
                        </p>

                        <p className="neon-text-muted mt-1 text-sm">
                          Plateforme :{" "}
                          <span className="text-white">{memberPlatform}</span>
                        </p>

                        {member.tempPlayer?.note ? (
                          <p className="neon-text-muted mt-2 text-xs">
                            Note :{" "}
                            <span className="text-white">
                              {member.tempPlayer.note}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="neon-text-muted mt-4 text-sm">
                Aucune équipe générée pour toi pour le moment.
              </p>
            )}
          </div>
        </div>

        <div className="neon-card p-8">
          <form action={updateProfile} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Nom affiché
              </label>
              <input
                name="displayName"
                type="text"
                required
                defaultValue={user.displayName}
                className="w-full px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-3 opacity-70"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Pseudo Warzone
              </label>
              <input
                name="warzoneUsername"
                type="text"
                required
                defaultValue={user.warzoneUsername}
                className="w-full px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Activision ID
              </label>
              <input
                name="activisionId"
                type="text"
                defaultValue={user.activisionId ?? ""}
                placeholder="Pseudo#1234567"
                className="w-full px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Plateforme
              </label>
              <select
                name="platform"
                defaultValue={user.platform ?? ""}
                className="w-full px-4 py-3"
              >
                <option value="">Choisir</option>
                <option value="PC">PC</option>
                <option value="PS5">PS5</option>
                <option value="PS4">PS4</option>
                <option value="XBOX_SERIES">Xbox Series</option>
                <option value="XBOX_ONE">Xbox One</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Rôle préféré
              </label>
              <select
                name="preferredRole"
                defaultValue={user.preferredRole ?? "NONE"}
                className="w-full px-4 py-3"
              >
                <option value="NONE">Aucun</option>
                <option value="RUSH">Rush</option>
                <option value="SUPPORT">Support</option>
                <option value="SNIPE">Snipe</option>
                <option value="FLEX">Flex</option>
                <option value="IGL">IGL</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Discord
              </label>
              <input
                name="discordUsername"
                type="text"
                defaultValue={user.discordUsername ?? ""}
                placeholder="pseudo_discord"
                className="w-full px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                WhatsApp
              </label>
              <input
                name="whatsappNumber"
                type="text"
                defaultValue={user.whatsappNumber ?? ""}
                placeholder="+33600000000"
                className="w-full px-4 py-3"
              />
            </div>

            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <input
                  name="micAvailable"
                  type="checkbox"
                  defaultChecked={user.micAvailable}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white">Micro disponible</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <input
                  name="whatsappOptIn"
                  type="checkbox"
                  defaultChecked={user.whatsappOptIn}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white">
                  J’accepte les notifications WhatsApp
                </span>
              </label>
            </div>

            {errorMessage ? (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-rose-400">{errorMessage}</p>
              </div>
            ) : null}

            {isSuccess ? (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-emerald-400">
                  Profil mis à jour avec succès.
                </p>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <button type="submit" className="neon-button w-full px-4 py-3">
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      </div>
    </SiteShell>
  );
}