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

/**
 * ✅ Nouveau nom (AC2N)
 * Utilisé par les imports récents.
 */
export async function toggleAC2NMember(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const nextValue = String(formData.get("nextValue") ?? "").trim();

  if (!userId || (nextValue !== "true" && nextValue !== "false")) {
    redirect("/admin/players?error=validation");
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        // ⚠️ on garde le champ DB tel quel pour l’instant
        isEhpadMember: nextValue === "true",
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;

    console.error("TOGGLE_AC2N_MEMBER_ERROR", error);
    redirect("/admin/players?error=server");
  }

  redirect(`/admin/players?ehpad=${nextValue === "true" ? "1" : "0"}`);
}

/**
 * ✅ Ancien nom (EHPAD)
 * Alias pour ne rien casser ailleurs.
 */
export const toggleEhpadMember = toggleAC2NMember;