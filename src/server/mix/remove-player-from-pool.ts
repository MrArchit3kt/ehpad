"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

type MixGame = "WARZONE" | "ROCKET_LEAGUE";

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function gameFrom(v: unknown): MixGame {
  const g = String(v ?? "").trim().toUpperCase();
  return g === "ROCKET_LEAGUE" ? "ROCKET_LEAGUE" : "WARZONE";
}

function backTo(game: MixGame) {
  return game === "ROCKET_LEAGUE" ? "/admin/mix/rocket-league" : "/admin/mix/warzone";
}

export async function removePlayerFromPool(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const game = gameFrom(formData.get("game"));
  const userId = String(formData.get("userId") ?? "").trim();
  const tempPlayerId = String(formData.get("tempPlayerId") ?? "").trim();

  if (!userId && !tempPlayerId) redirect(`${backTo(game)}?error=server`);

  try {
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data:
          game === "ROCKET_LEAGUE"
            ? { isAvailableForRocketLeagueMix: false, isOnline: false }
            : { isAvailableForWarzoneMix: false, isOnline: false },
      });
    } else {
      await db.tempPlayer.update({
        where: { id: tempPlayerId },
        data: { isAvailableForMix: false },
      });
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("REMOVE_PLAYER_FROM_POOL_ERROR", error);
    redirect(`${backTo(game)}?error=server`);
  }

  redirect(`${backTo(game)}?removed=1`);
}