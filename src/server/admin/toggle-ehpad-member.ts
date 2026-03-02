"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

export async function toggleEhpadMember(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "");
  const nextValueRaw = String(formData.get("nextValue") ?? "");

  if (!userId || !["true", "false"].includes(nextValueRaw)) {
    redirect("/admin/players?error=server");
  }

  const nextValue = nextValueRaw === "true";

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        isEhpadMember: nextValue,
      },
    });
  } catch (error) {
    console.error("TOGGLE_EHPAD_MEMBER_ERROR", error);
    redirect("/admin/players?error=server");
  }

  redirect(`/admin/players?ehpad=${nextValue ? "1" : "0"}`);
}