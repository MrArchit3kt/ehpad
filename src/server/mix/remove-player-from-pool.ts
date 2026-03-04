"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

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
    console.error("REMOVE_PLAYER_FROM_POOL_ERROR", error);
    redirect("/admin/mix?error=server");
  }

  redirect("/admin/mix?removed=1");
}