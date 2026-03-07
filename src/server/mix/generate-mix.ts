"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/session";

type MixGame = "WARZONE" | "ROCKET_LEAGUE";
type RocketLeagueTeamSize = "TWO" | "THREE";

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function gameFrom(v: unknown): MixGame | null {
  if (typeof v !== "string") return null;
  const g = v.trim().toUpperCase();
  if (g === "WARZONE" || g === "ROCKET_LEAGUE") return g as MixGame;
  return null;
}

function redirectToGame(game: MixGame, qs: string) {
  const path =
    game === "WARZONE" ? "/admin/mix/warzone" : "/admin/mix/rocket-league";
  redirect(`${path}${qs}`);
}

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** WARZONE: tailles 4/3 */
function getTeamSizesWarzone(total: number): number[] | null {
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

const RL_RANK_ORDER = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "CHAMPION",
  "GRAND_CHAMPION",
  "SSL",
] as const;

type RLRank = (typeof RL_RANK_ORDER)[number];

function rankIndex(rank: string): number {
  const idx = RL_RANK_ORDER.indexOf(rank as RLRank);
  return idx === -1 ? -1 : idx;
}

/**
 * Construit des teams RL en respectant:
 * - teamSize imposé (2 ou 3) [Option B]
 * - écart max de 1 tier dans une team (ex: Gold+Plat ok, Gold+Diamond non)
 */
function buildRocketLeagueTeams(
  players: { id: string; rocketLeagueRank: string }[],
  teamSize: 2 | 3,
): { id: string; rocketLeagueRank: string }[][] | null {
  const sorted = [...players].sort(
    (a, b) => rankIndex(a.rocketLeagueRank) - rankIndex(b.rocketLeagueRank),
  );

  if (sorted.some((p) => rankIndex(p.rocketLeagueRank) === -1)) return null;

  // doit être divisible exactement par teamSize (Option B strict)
  if (sorted.length % teamSize !== 0) return null;

  const teams: { id: string; rocketLeagueRank: string }[][] = [];

  let i = 0;
  while (i < sorted.length) {
    const slice = sorted.slice(i, i + teamSize);
    if (slice.length < teamSize) return null;

    const min = rankIndex(slice[0].rocketLeagueRank);
    const max = rankIndex(slice[slice.length - 1].rocketLeagueRank);

    if (max - min > 1) {
      // fenêtre un peu plus large pour essayer une combinaison valide
      const window = sorted.slice(i, i + teamSize + 2);
      const candidates = shuffle(window);

      const pick = teamSize === 2 ? findPair(candidates) : findTrio(candidates);
      if (!pick) return null;

      // rebuild : retirer pick puis repartir
      const pickIds = new Set(pick.map((p) => p.id));
      const remaining = sorted.filter((p) => !pickIds.has(p.id));

      sorted.length = 0;
      sorted.push(...remaining);

      i = 0;
      teams.length = 0;
      continue;
    }

    teams.push(slice);
    i += teamSize;
  }

  return teams;
}

function isValidTeam(team: { rocketLeagueRank: string }[]): boolean {
  const indices = team
    .map((p) => rankIndex(p.rocketLeagueRank))
    .filter((x) => x >= 0);

  if (indices.length !== team.length) return false;

  const min = Math.min(...indices);
  const max = Math.max(...indices);
  return max - min <= 1;
}

function findPair(players: { id: string; rocketLeagueRank: string }[]) {
  for (let a = 0; a < players.length; a += 1) {
    for (let b = a + 1; b < players.length; b += 1) {
      const team = [players[a], players[b]];
      if (isValidTeam(team)) return team;
    }
  }
  return null;
}

function findTrio(players: { id: string; rocketLeagueRank: string }[]) {
  for (let a = 0; a < players.length; a += 1) {
    for (let b = a + 1; b < players.length; b += 1) {
      for (let c = b + 1; c < players.length; c += 1) {
        const team = [players[a], players[b], players[c]];
        if (isValidTeam(team)) return team;
      }
    }
  }
  return null;
}

function teamSizeFromLock(
  v: RocketLeagueTeamSize | null | undefined,
): 2 | 3 | null {
  if (v === "TWO") return 2;
  if (v === "THREE") return 3;
  return null;
}

export async function generateMix(formData: FormData) {
  const sessionUser = await requireAuth();
  if (!sessionUser) redirect("/login");

  const game = gameFrom(formData.get("game"));
  if (!game) redirect("/dashboard");

  // Vérifie si admin online
  const onlineAdminsCount = await db.user.count({
    where: {
      isOnline: true,
      status: "ACTIVE",
      registrationStatus: "APPROVED",
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
    },
  });

  // Lock par jeu (PK = game)
  const lock = await db.mixGenerationLock.findUnique({
    where: { game },
    select: { selectedUserId: true, rocketLeagueTeamSize: true },
  });

  // Autorisation :
  // - si lock.selectedUserId existe => seul selectedUserId peut générer
  // - sinon si admin online => interdit (forcer sélection)
  // - sinon (0 admin online) => autoriser un player MAIS seulement s’il est dans la file du jeu
  if (lock?.selectedUserId) {
    if (lock.selectedUserId !== sessionUser.id) {
      redirectToGame(game, "?error=locked");
    }
  } else {
    if (onlineAdminsCount > 0) {
      redirectToGame(game, "?error=no_mix_admin");
    }

    const me = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        isAvailableForWarzoneMix: true,
        isAvailableForRocketLeagueMix: true,
      },
    });

    const inQueue =
      game === "WARZONE"
        ? !!me?.isAvailableForWarzoneMix
        : !!me?.isAvailableForRocketLeagueMix;

    if (!inQueue) {
      redirect("/profil?error=forbidden");
    }
  }

  try {
    // =========================
    // WARZONE
    // =========================
    if (game === "WARZONE") {
      const users = await db.user.findMany({
        where: {
          status: "ACTIVE",
          registrationStatus: "APPROVED",
          isAvailableForWarzoneMix: true,
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      const tempPlayers = await db.tempPlayer.findMany({
        where: { isAvailableForMix: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      const pool = [
        ...users.map((u) => ({ kind: "USER" as const, id: u.id })),
        ...tempPlayers.map((t) => ({ kind: "TEMP" as const, id: t.id })),
      ];

      const teamSizes = getTeamSizesWarzone(pool.length);
      if (!teamSizes) redirectToGame(game, "?error=invalid_count");

      // ✅ TS fix: teamSizes non-null après le check
      const sizes = teamSizes as number[];

      const shuffled = shuffle(pool);

      const session = await db.mixSession.create({
        data: {
          game,
          status: "GENERATED",
          allowTeamsOfThree: true,
          keepRemainderAsBench: false,
          createdById: sessionUser.id,
        },
      });

      // entries (bulk)
      if (shuffled.length > 0) {
        await db.mixSessionPlayer.createMany({
          data: shuffled.map((p) => ({
            sessionId: session.id,
            userId: p.kind === "USER" ? p.id : null,
            tempPlayerId: p.kind === "TEMP" ? p.id : null,
            status: "WAITING",
          })),
        });
      }

      // teams
      let cursor = 0;
      for (let idx = 0; idx < sizes.length; idx += 1) {
        const size = sizes[idx];
        const chunk = shuffled.slice(cursor, cursor + size);

        const team = await db.team.create({
          data: { sessionId: session.id, teamNumber: idx + 1 },
        });

        if (chunk.length > 0) {
          await db.teamMember.createMany({
            data: chunk.map((p) => ({
              teamId: team.id,
              userId: p.kind === "USER" ? p.id : null,
              tempPlayerId: p.kind === "TEMP" ? p.id : null,
            })),
          });

          // status ASSIGNED
          const userIds = chunk
            .filter((p) => p.kind === "USER")
            .map((p) => p.id);
          const tempIds = chunk
            .filter((p) => p.kind === "TEMP")
            .map((p) => p.id);

          if (userIds.length > 0) {
            await db.mixSessionPlayer.updateMany({
              where: { sessionId: session.id, userId: { in: userIds } },
              data: { status: "ASSIGNED", assignedAt: new Date() },
            });
          }

          if (tempIds.length > 0) {
            await db.mixSessionPlayer.updateMany({
              where: { sessionId: session.id, tempPlayerId: { in: tempIds } },
              data: { status: "ASSIGNED", assignedAt: new Date() },
            });
          }
        }

        cursor += size;
      }

      redirectToGame(game, `?success=1&session=${session.id}`);
    }

    // =========================
    // ROCKET LEAGUE (Option B strict 2v2 / 3v3 via lock)
    // =========================

    const requiredTeamSize = teamSizeFromLock(lock?.rocketLeagueTeamSize);
    if (!requiredTeamSize) {
      redirectToGame(game, "?error=no_team_size");
    }

    // ✅ TS fix: on fige un type non-null
    const rlTeamSize = requiredTeamSize as 2 | 3;

    const users = await db.user.findMany({
      where: {
        status: "ACTIVE",
        registrationStatus: "APPROVED",
        isAvailableForRocketLeagueMix: true,
      },
      select: {
        id: true,
        rocketLeagueRank: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (users.length < rlTeamSize) {
      redirectToGame(game, "?error=invalid_count");
    }

    if (users.some((u) => !u.rocketLeagueRank)) {
      redirectToGame(game, "?error=rank_missing");
    }

    // strict divisible
    if (users.length % rlTeamSize !== 0) {
      redirectToGame(game, "?error=invalid_count");
    }

    const teams = buildRocketLeagueTeams(
      users.map((u) => ({ id: u.id, rocketLeagueRank: u.rocketLeagueRank! })),
      rlTeamSize,
    );

    if (!teams) {
      redirectToGame(game, "?error=rank_gap");
    }

    // ✅ TS: non-null après check
    const rlTeams = teams as { id: string; rocketLeagueRank: string }[][];

    const session = await db.mixSession.create({
      data: {
        game,
        rocketLeagueTeamSize: rlTeamSize === 2 ? "TWO" : "THREE",
        status: "GENERATED",
        allowTeamsOfThree: rlTeamSize === 3,
        keepRemainderAsBench: false,
        createdById: sessionUser.id,
      },
    });

    // entries (bulk)
    if (users.length > 0) {
      await db.mixSessionPlayer.createMany({
        data: users.map((u) => ({
          sessionId: session.id,
          userId: u.id,
          status: "WAITING",
        })),
      });
    }

    // teams
    for (let idx = 0; idx < rlTeams.length; idx += 1) {
      const team = await db.team.create({
        data: { sessionId: session.id, teamNumber: idx + 1 },
      });

      const ids = rlTeams[idx].map((p) => p.id);

      if (ids.length > 0) {
        await db.teamMember.createMany({
          data: ids.map((id) => ({ teamId: team.id, userId: id })),
        });

        await db.mixSessionPlayer.updateMany({
          where: { sessionId: session.id, userId: { in: ids } },
          data: { status: "ASSIGNED", assignedAt: new Date() },
        });
      }
    }

    redirectToGame(game, `?success=1&session=${session.id}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("GENERATE_MIX_ERROR", error);
    redirectToGame(game, "?error=server");
  }
}