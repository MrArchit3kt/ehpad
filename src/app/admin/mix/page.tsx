export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/lib/prisma";
import { generateMix } from "@/server/mix/generate-mix";
import { removePlayerFromPool } from "@/server/mix/remove-player-from-pool";
import { AdminPoolAdder } from "@/components/admin/admin-pool-adder";

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid_count":
      return "Nombre de joueurs invalide pour une répartition en équipes de 3 et 4 (ex: 1, 2 ou 5).";
    case "server":
      return "Erreur serveur pendant l’action demandée.";
    default:
      return null;
  }
}

function getTeamSizesPreview(total: number): number[] | null {
  if (total < 3) return null;
  if (total === 5) return null;

  for (let teamsOf4 = Math.floor(total / 4); teamsOf4 >= 0; teamsOf4 -= 1) {
    const remainder = total - teamsOf4 * 4;

    if (remainder % 3 === 0) {
      const teamsOf3 = remainder / 3;
      return [...Array(teamsOf4).fill(4), ...Array(teamsOf3).fill(3)];
    }
  }

  return null;
}

function formatTeamSizesPreview(total: number) {
  const sizes = getTeamSizesPreview(total);

  if (!sizes) {
    return "Impossible";
  }

  const teamsOf4 = sizes.filter((size) => size === 4).length;
  const teamsOf3 = sizes.filter((size) => size === 3).length;

  const parts: string[] = [];

  if (teamsOf4 > 0) {
    parts.push(`${teamsOf4}x4`);
  }

  if (teamsOf3 > 0) {
    parts.push(`${teamsOf3}x3`);
  }

  return parts.join(" + ");
}

export default async function AdminMixPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    removed?: string;
    added?: string;
    session?: string;
  }>;
}) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const sp = (await searchParams) ?? {};
  const errorMessage = getErrorMessage(sp.error);
  const isSuccess = sp.success === "1";
  const isRemoved = sp.removed === "1";
  const isAdded = sp.added === "1";
  const sessionId = sp.session;

  const availablePlayers = await db.user.findMany({
    where: {
      status: "ACTIVE",
      isAvailableForMix: true,
    },
    select: {
      id: true,
      displayName: true,
      username: true,
      warzoneUsername: true,
      platform: true,
    },
    orderBy: {
      displayName: "asc",
    },
  });

  const availablePlayerIds = availablePlayers.map((player) => player.id);

  const poolCandidates = await db.user.findMany({
    where: {
      status: "ACTIVE",
      id: {
        notIn: availablePlayerIds.length > 0 ? availablePlayerIds : undefined,
      },
    },
    select: {
      id: true,
      displayName: true,
      username: true,
      warzoneUsername: true,
      platform: true,
    },
    orderBy: {
      displayName: "asc",
    },
  });

  const poolDistribution = formatTeamSizesPreview(availablePlayers.length);
  const canGenerate = poolDistribution !== "Impossible";

  const latestSession = sessionId
    ? await db.mixSession.findUnique({
        where: { id: sessionId },
        include: {
          teams: {
            orderBy: { teamNumber: "asc" },
            include: {
              members: {
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
                },
              },
            },
          },
        },
      })
    : await db.mixSession.findFirst({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          teams: {
            orderBy: { teamNumber: "asc" },
            include: {
              members: {
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
                },
              },
            },
          },
        },
      });

  return (
    <SiteShell>
      <div className="grid gap-6">
        <div className="neon-card p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
            Admin Mix
          </p>
          <h2 className="neon-title neon-gradient-text mt-3 text-2xl font-black md:text-3xl">
            Mélangeur d’équipes
          </h2>
          <p className="neon-text-muted mt-4 max-w-3xl leading-7">
            Le système répartit les joueurs du pool en équipes de 4 et 3.
            Aucun remplaçant, aucun joueur laissé de côté.
          </p>
        </div>

        <div className="neon-card p-6 md:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                Joueurs disponibles
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">
                {availablePlayers.length} joueur
                {availablePlayers.length > 1 ? "s" : ""} prêt
                {availablePlayers.length > 1 ? "s" : ""}
              </h3>
              <p className="neon-text-muted mt-2 text-sm">
                Les joueurs restent dans le pool jusqu’à retrait manuel ou déconnexion.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="neon-card-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                  Total pool
                </p>
                <p className="neon-title neon-gradient-text mt-1 text-xl font-black md:text-2xl">
                  {availablePlayers.length}
                </p>
              </div>

              <div className="neon-card-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300/75">
                  Répartition
                </p>
                <p className="mt-1 text-xl font-black text-white md:text-2xl">
                  {poolDistribution}
                </p>
              </div>

              <form action={generateMix}>
                <button
                  type="submit"
                  className={`px-5 py-3 ${
                    canGenerate ? "neon-button" : "neon-button-secondary opacity-60"
                  }`}
                  disabled={!canGenerate}
                >
                  Générer
                </button>
              </form>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-5 text-sm font-medium text-rose-400">{errorMessage}</p>
          ) : null}

          {isSuccess ? (
            <p className="mt-5 text-sm font-medium text-emerald-400">
              Équipes générées avec succès.
            </p>
          ) : null}

          {isRemoved ? (
            <p className="mt-5 text-sm font-medium text-amber-300">
              Joueur retiré du pool avec succès.
            </p>
          ) : null}

          {isAdded ? (
            <p className="mt-5 text-sm font-medium text-emerald-300">
              Joueur ajouté au pool avec succès.
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availablePlayers.length === 0 ? (
              <div className="neon-card-soft p-5">
                <p className="neon-text-muted text-sm">
                  Aucun joueur disponible pour le moment.
                </p>
              </div>
            ) : (
              availablePlayers.map((player) => (
                <div key={player.id} className="neon-card-soft p-4">
                  <h4 className="text-sm font-bold text-white md:text-base">
                    {player.displayName}
                  </h4>
                  <p className="neon-text-muted mt-1 text-xs md:text-sm">
                    @{player.username}
                  </p>
                  <p className="neon-text-muted mt-2 text-xs md:text-sm">
                    Warzone : <span className="text-white">{player.warzoneUsername}</span>
                  </p>
                  <p className="neon-text-muted mt-1 text-xs md:text-sm">
                    Plateforme :{" "}
                    <span className="text-white">
                      {player.platform ?? "Non renseignée"}
                    </span>
                  </p>

                  <div className="mt-3">
                    <form action={removePlayerFromPool}>
                      <input type="hidden" name="userId" value={player.id} />
                      <button
                        type="submit"
                        className="neon-button-secondary w-full px-4 py-2.5 text-sm"
                      >
                        Retirer du pool
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <AdminPoolAdder players={poolCandidates} />

        {latestSession ? (
          <div className="neon-card p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
                  Dernier mix généré
                </p>
                <h3 className="mt-2 text-xl font-bold text-white md:text-2xl">
                  Session {latestSession.id.slice(-6).toUpperCase()}
                </h3>
              </div>

              <span className="neon-badge">
                {latestSession.teams.length} team
                {latestSession.teams.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {latestSession.teams.map((team) => (
                <div key={team.id} className="neon-card-soft p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-white">
                      Team {team.teamNumber}
                    </h4>
                    <span className="neon-badge text-[10px]">
                      {team.members.length} joueur{team.members.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                      >
                        <p className="text-sm font-semibold text-white">
                          {member.user.displayName}
                        </p>
                        <p className="neon-text-muted mt-0.5 text-xs">
                          @{member.user.username}
                        </p>
                        <p className="neon-text-muted mt-1 text-xs">
                          {member.user.warzoneUsername}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}