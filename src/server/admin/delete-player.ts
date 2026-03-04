"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";
import { publishAdminEvent } from "@/server/admin/admin-live-events";

export async function deletePlayer(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/admin/players?error=validation");
  }

  if (userId === admin.id) {
    redirect("/admin/players?error=self_delete");
  }

  try {
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      redirect("/admin/players?error=player_not_found");
    }

    if (targetUser.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
      redirect("/admin/players?error=forbidden");
    }

    if (targetUser.role === "SUPER_ADMIN") {
      redirect("/admin/players?error=forbidden");
    }

    await db.user.delete({
      where: { id: userId },
    });

    publishAdminEvent("players");
  } catch (error) {
    console.error("DELETE_PLAYER_ERROR", error);
    redirect("/admin/players?error=server");
  }

  redirect("/admin/players?deleted=1");
}