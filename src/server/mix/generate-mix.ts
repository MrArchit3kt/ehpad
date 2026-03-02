"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

type SimplePlayer = {
  id: string;
};

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

  const players = await db.user.findMany({
    where: {
      status: "ACTIVE",
      isAvailableForMix: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const teamSizes = getTeamSizes(players.length);

  if (!teamSizes) {
    redirect("/admin/mix?error=invalid_count");
  }

  try {
    const shuffledPlayers = shuffle<SimplePlayer>(players);

    const session = await db.mixSession.create({
      data: {
        status: "GENERATED",
        allowTeamsOfThree: true,
        keepRemainderAsBench: false,
        createdById: admin.id,
      },
    });

    if (shuffledPlayers.length > 0) {
      await db.mixSessionPlayer.createMany({
        data: shuffledPlayers.map((player) => ({
          sessionId: session.id,
          userId: player.id,
          status: "WAITING",
        })),
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

      if (teamPlayers.length > 0) {
        await db.teamMember.createMany({
          data: teamPlayers.map((player) => ({
            teamId: team.id,
            userId: player.id,
          })),
        });

        await db.mixSessionPlayer.updateMany({
          where: {
            sessionId: session.id,
            userId: {
              in: teamPlayers.map((player) => player.id),
            },
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
    console.error("GENERATE_MIX_ERROR", error);
    redirect("/admin/mix?error=server");
  }
}