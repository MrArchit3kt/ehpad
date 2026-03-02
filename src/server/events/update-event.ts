"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";
import { resolveEventImageInput } from "@/server/events/_event-image";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateEvent(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id || !title || !description || !eventDate) {
    redirect("/admin/events?error=server");
  }

  try {
    const existing = await db.event.findUnique({
      where: { id },
      select: {
        id: true,
        coverImageUrl: true,
      },
    });

    if (!existing) {
      redirect("/admin/events?error=server");
    }

    const resolvedImage = await resolveEventImageInput(
      formData.get("coverImageUrl"),
      formData.get("coverImageFile"),
    );

    await db.event.update({
      where: { id },
      data: {
        title,
        slug: `${slugify(title)}-${id.slice(-6).toLowerCase()}`,
        description,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        coverImageUrl: resolvedImage ?? existing.coverImageUrl,
        status: status as any,
        publishInApp: formData.get("publishInApp") === "on",
        publishToDiscord: formData.get("publishToDiscord") === "on",
        publishToWhatsApp: formData.get("publishToWhatsApp") === "on",
      },
    });

    redirect("/admin/events?updated=1");
  } catch (error) {
    console.error("UPDATE_EVENT_ERROR", error);
    redirect("/admin/events?error=server");
  }
}