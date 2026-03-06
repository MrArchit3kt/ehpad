"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";
import { publishAdminEvent } from "@/server/admin/admin-live-events";

export async function toggleEhpadMember(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const nextValueRaw = String(formData.get("nextValue") ?? "").trim();

  if (!userId || !["true", "false"].includes(nextValueRaw)) {
    redirect("/admin/players?error=validation");
  }

  const nextValue = nextValueRaw === "true";

  try {
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      redirect("/admin/players?error=player_not_found");
    }

    await db.user.update({
      where: { id: userId },
      data: {
        isEhpadMember: nextValue,
      },
    });

    publishAdminEvent("players");
  } catch (error) {
    console.error("TOGGLE_EHPAD_MEMBER_ERROR", error);
    redirect("/admin/players?error=server");
  }

  redirect(`/admin/players?AC2N=${nextValue ? "1" : "0"}`);
}