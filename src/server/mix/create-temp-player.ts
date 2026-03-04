"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

const createTempPlayerSchema = z.object({
  nickname: z.string().trim().min(2).max(40),
  note: z.string().trim().max(200).optional(),
});

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

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

  const nickname = parsed.data.nickname.trim();
  const note = parsed.data.note?.trim() || null;

  try {
    const existingTempPlayer = await db.tempPlayer.findFirst({
      where: {
        nickname: {
          equals: nickname,
          mode: "insensitive",
        },
        isAvailableForMix: true,
      },
      select: { id: true },
    });

    if (existingTempPlayer) {
      redirect("/admin/mix?error=server");
    }

    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          {
            displayName: {
              equals: nickname,
              mode: "insensitive",
            },
          },
          {
            username: {
              equals: nickname.toLowerCase(),
              mode: "insensitive",
            },
          },
          {
            warzoneUsername: {
              equals: nickname,
              mode: "insensitive",
            },
          },
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      redirect("/admin/mix?error=server");
    }

    await db.tempPlayer.create({
      data: {
        nickname,
        note,
        isAvailableForMix: true,
        createdById: admin.id,
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("CREATE_TEMP_PLAYER_ERROR", error);
    redirect("/admin/mix?error=server");
  }

  redirect("/admin/mix?added=1");
}