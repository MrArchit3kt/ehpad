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

export async function setMixGenerator(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const selectedAdminId = String(formData.get("selectedAdminId") ?? "").trim();

  try {
    if (!selectedAdminId) {
      await db.mixGenerationLock.upsert({
        where: { id: "main" },
        create: {
          id: "main",
          selectedAdminId: null,
        },
        update: {
          selectedAdminId: null,
        },
      });

      redirect("/admin/mix?lock_cleared=1");
    }

    const selectedAdmin = await db.user.findUnique({
      where: { id: selectedAdminId },
      select: {
        id: true,
        role: true,
        status: true,
        registrationStatus: true,
        isOnline: true,
      },
    });

    if (!selectedAdmin) {
      redirect("/admin/mix?error=server");
    }

    const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

    if (
      !allowedRoles.includes(selectedAdmin.role) ||
      selectedAdmin.status !== "ACTIVE" ||
      selectedAdmin.registrationStatus !== "APPROVED"
    ) {
      redirect("/admin/mix?error=server");
    }

    await db.mixGenerationLock.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        selectedAdminId: selectedAdmin.id,
      },
      update: {
        selectedAdminId: selectedAdmin.id,
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("SET_MIX_GENERATOR_ERROR", error);
    redirect("/admin/mix?error=server");
  }

  redirect("/admin/mix?lock_set=1");
}