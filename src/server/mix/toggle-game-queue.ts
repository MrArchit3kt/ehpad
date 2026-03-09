"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/session";

const ALLOWED = ["WARZONE", "WARZONE_RANKED", "ROCKET_LEAGUE"] as const;
type MixGame = (typeof ALLOWED)[number];

function gameFrom(v: unknown): MixGame | null {
  if (typeof v !== "string") return null;
  const g = v.trim().toUpperCase();
  return (ALLOWED as readonly string[]).includes(g) ? (g as MixGame) : null;
}

export async function toggleGameQueue(formData: FormData) {
  const user = await requireAuth();
  if (!user) redirect("/login");

  const game = gameFrom(formData.get("game"));
  if (!game) redirect("/profil?error=server");

  const me = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      status: true,
      registrationStatus: true,
      isAvailableForWarzoneMix: true,
      isAvailableForWarzoneRankedMix: true,
      isAvailableForRocketLeagueMix: true,
    },
  });

  if (!me || me.status !== "ACTIVE" || me.registrationStatus !== "APPROVED") {
    redirect("/profil?error=server");
  }

  // toggle la file choisie, et coupe toutes les autres
  const nextWarzone =
    game === "WARZONE" ? !me.isAvailableForWarzoneMix : false;

  const nextWarzoneRanked =
    game === "WARZONE_RANKED" ? !me.isAvailableForWarzoneRankedMix : false;

  const nextRL =
    game === "ROCKET_LEAGUE" ? !me.isAvailableForRocketLeagueMix : false;

  await db.user.update({
    where: { id: me.id },
    data: {
      isAvailableForWarzoneMix: nextWarzone,
      isAvailableForWarzoneRankedMix: nextWarzoneRanked,
      isAvailableForRocketLeagueMix: nextRL,
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });

  redirect("/profil?success=1");
}