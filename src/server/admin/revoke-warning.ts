"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

export async function revokeWarning(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const warningId = String(formData.get("warningId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!warningId) {
    redirect("/admin/players?error=server");
  }

  try {
    const warning = await db.warning.findUnique({
      where: { id: warningId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!warning) {
      redirect("/admin/players?error=server");
    }

    if (warning.status !== "ACTIVE") {
      redirect("/admin/players?revoked=1");
    }

    await db.warning.update({
      where: { id: warning.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: reason || "Révocation manuelle par un admin.",
        revokedByAdminId: admin.id,
      },
    });
  } catch (error) {
    console.error("REVOKE_WARNING_ERROR", error);
    redirect("/admin/players?error=server");
  }

  redirect("/admin/players?revoked=1");
}