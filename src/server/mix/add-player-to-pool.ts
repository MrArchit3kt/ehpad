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

export async function addPlayerToPool(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const game = gameFrom(formData.get("game"));
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) redirect(`${backTo(game)}?error=server`);

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, registrationStatus: true },
    });

    if (!user || user.status !== "ACTIVE" || user.registrationStatus !== "APPROVED") {
      redirect(`${backTo(game)}?error=server`);
    }

    await db.user.update({
      where: { id: user.id },
      data:
        game === "ROCKET_LEAGUE"
          ? { isAvailableForRocketLeagueMix: true, isAvailableForWarzoneMix: false }
          : { isAvailableForWarzoneMix: true, isAvailableForRocketLeagueMix: false },
    });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("ADD_PLAYER_TO_POOL_ERROR", error);
    redirect(`${backTo(game)}?error=server`);
  }

  redirect(`${backTo(game)}?added=1`);
}