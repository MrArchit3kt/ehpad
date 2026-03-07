"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/session";

type MixGame = "WARZONE" | "ROCKET_LEAGUE";

function gameFrom(v: unknown): MixGame | null {
  if (typeof v !== "string") return null;
  const g = v.trim().toUpperCase();
  if (g === "WARZONE" || g === "ROCKET_LEAGUE") return g as MixGame;
  return null;
}

export async function toggleMixAvailability(formData: FormData) {
  const user = await requireAuth();

  if (!user) {
    redirect("/login");
  }

  const game = gameFrom(formData.get("game"));
  if (!game) {
    redirect("/profil?error=validation");
  }

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        status: true,
        isAvailableForMix: true,
        isAvailableForWarzoneMix: true,
        isAvailableForRocketLeagueMix: true,
      },
    });

    if (!dbUser || dbUser.status === "BANNED") {
      redirect("/profil?error=banned");
    }

    const nextWarzone =
      game === "WARZONE" ? !dbUser.isAvailableForWarzoneMix : false;

    const nextRocket =
      game === "ROCKET_LEAGUE" ? !dbUser.isAvailableForRocketLeagueMix : false;

    // compat: un flag global = OR des deux files
    const nextGlobal = nextWarzone || nextRocket;

    await db.user.update({
      where: { id: user.id },
      data: {
        isAvailableForWarzoneMix: nextWarzone,
        isAvailableForRocketLeagueMix: nextRocket,
        isAvailableForMix: nextGlobal,

        // utile pour considérer l’utilisateur "présent"
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });
  } catch (error) {
    console.error("TOGGLE_MIX_AVAILABILITY_ERROR", error);
    redirect("/profil?error=server");
  }

  redirect("/profil?success=1");
}