"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

const createTempPlayerSchema = z.object({
  nickname: z.string().trim().min(2).max(40),
  note: z.string().trim().max(200).optional(),
});

export async function createTempPlayer(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const parsed = createTempPlayerSchema.safeParse({
    nickname: String(formData.get("nickname") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    redirect("/admin/mix?error=server");
  }

  try {
    await db.tempPlayer.create({
      data: {
        nickname: parsed.data.nickname,
        note: parsed.data.note || null,
        isAvailableForMix: true,
        createdById: admin.id,
      },
    });
  } catch (error) {
    console.error("CREATE_TEMP_PLAYER_ERROR", error);
    redirect("/admin/mix?error=server");
  }

  redirect("/admin/mix?added=1");
}