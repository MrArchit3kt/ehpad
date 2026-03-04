"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function removePlayerFromPool(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const tempPlayerId = String(formData.get("tempPlayerId") ?? "").trim();

  if (!userId && !tempPlayerId) {
    redirect("/admin/mix?error=server");
  }

  try {
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: {
          isAvailableForMix: false,
          isOnline: false,
        },
      });
    } else if (tempPlayerId) {
      await db.tempPlayer.update({
        where: { id: tempPlayerId },
        data: {
          isAvailableForMix: false,
        },
      });
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("REMOVE_PLAYER_FROM_POOL_ERROR", error);
    redirect("/admin/mix?error=server");
  }

  redirect("/admin/mix?removed=1");
}