"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

export async function addPlayerToPool(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/admin/mix?error=server");
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        registrationStatus: true,
      },
    });

    if (!user) {
      redirect("/admin/mix?error=server");
    }

    if (user.status !== "ACTIVE" || user.registrationStatus !== "APPROVED") {
      redirect("/admin/mix?error=server");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        isAvailableForMix: true,
      },
    });
  } catch (error) {
    console.error("ADD_PLAYER_TO_POOL_ERROR", error);
    redirect("/admin/mix?error=server");
  }

  redirect("/admin/mix?added=1");
}