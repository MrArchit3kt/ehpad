"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/session";

export async function toggleMixAvailability() {
  const user = await requireAuth();

  if (!user) {
    redirect("/login");
  }

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        status: true,
        isAvailableForMix: true,
      },
    });

    if (!dbUser || dbUser.status === "BANNED") {
      redirect("/profil?error=banned");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        isAvailableForMix: !dbUser.isAvailableForMix,
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