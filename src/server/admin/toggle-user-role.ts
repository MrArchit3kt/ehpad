"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

export async function toggleUserRole(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  if (admin.role !== "ADMIN") {
    redirect("/admin/players?error=forbidden");
  }

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/admin/players?error=validation");
  }

  if (userId === admin.id) {
    redirect("/admin/players?error=self_role");
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

    if (targetUser.role === "SUPER_ADMIN") {
      redirect("/admin/players?error=super_admin_locked");
    }

    const nextRole = targetUser.role === "ADMIN" ? "PLAYER" : "ADMIN";

    await db.user.update({
      where: { id: userId },
      data: {
        role: nextRole,
      },
    });
  } catch (error) {
    console.error("TOGGLE_USER_ROLE_ERROR", error);
    redirect("/admin/players?error=server");
  }

  redirect("/admin/players?role_updated=1");
}