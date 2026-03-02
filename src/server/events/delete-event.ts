"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

export async function deleteEvent(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin/events?error=server");
  }

  try {
    await db.event.delete({
      where: { id },
    });
  } catch (error) {
    console.error("DELETE_EVENT_ERROR", error);
    redirect("/admin/events?error=server");
  }

  redirect("/admin/events?deleted=1");
}