"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

type PoolPlayer =
  | {
      kind: "USER";
      id: string;
    }
  | {
      kind: "TEMP";
      id: string;
    };

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function shuffle<T>(items: T[]) {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function getTeamSizes(total: number): number[] | null {
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

export async function generateMix() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  // ✅ PK = game (plus id)
  const mixLock = await db.mixGenerationLock.findUnique({
    where: { game: "WARZONE" },
    select: {
      selectedUserId: true,
    },
  });

  // Si aucun admin sélectionné pour WARZONE
  if (!mixLock?.selectedUserId) {
    redirect("/admin/mix?error=no_mix_admin");
  }

  // Si un autre admin est sélectionné
  if (mixLock.selectedUserId !== admin.id) {
    redirect("/admin/mix?error=locked");
  }

  const users = await db.user.findMany({
    where: {
      status: "ACTIVE",
      registrationStatus: "APPROVED",
      // si tu as migré vers isAvailableForWarzoneMix, remplace ici :
      // isAvailableForWarzoneMix: true,
      isAvailableForMix: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const tempPlayers = await db.tempPlayer.findMany({
    where: {
      isAvailableForMix: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const poolPlayers: PoolPlayer[] = [
    ...users.map((player) => ({ kind: "USER" as const, id: player.id })),
    ...tempPlayers.map((player) => ({ kind: "TEMP" as const, id: player.id })),
  ];

  const teamSizes = getTeamSizes(poolPlayers.length);

  if (!teamSizes) {
    redirect("/admin/mix?error=invalid_count");
  }

  try {
    const shuffledPlayers = shuffle(poolPlayers);

    const session = await db.mixSession.create({
      data: {
        status: "GENERATED",
        allowTeamsOfThree: true,
        keepRemainderAsBench: false,
        createdById: admin.id,
        game: "WARZONE",
      },
    });

    for (const player of shuffledPlayers) {
      await db.mixSessionPlayer.create({
        data: {
          sessionId: session.id,
          userId: player.kind === "USER" ? player.id : null,
          tempPlayerId: player.kind === "TEMP" ? player.id : null,
          status: "WAITING",
        },
      });
    }

    let cursor = 0;

    for (let index = 0; index < teamSizes.length; index += 1) {
      const teamSize = teamSizes[index];
      const teamPlayers = shuffledPlayers.slice(cursor, cursor + teamSize);

      const team = await db.team.create({
        data: {
          sessionId: session.id,
          teamNumber: index + 1,
        },
      });

      for (const player of teamPlayers) {
        await db.teamMember.create({
          data: {
            teamId: team.id,
            userId: player.kind === "USER" ? player.id : null,
            tempPlayerId: player.kind === "TEMP" ? player.id : null,
          },
        });

        await db.mixSessionPlayer.updateMany({
          where: {
            sessionId: session.id,
            ...(player.kind === "USER"
              ? { userId: player.id }
              : { tempPlayerId: player.id }),
          },
          data: {
            status: "ASSIGNED",
            assignedAt: new Date(),
          },
        });
      }

      cursor += teamSize;
    }

    redirect(`/admin/mix?success=1&session=${session.id}`);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("GENERATE_MIX_ERROR", error);
    redirect("/admin/mix?error=server");
  }
}