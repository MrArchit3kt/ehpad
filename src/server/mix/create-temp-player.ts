"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

type MixGame = "WARZONE" | "ROCKET_LEAGUE";

const createTempPlayerSchema = z.object({
  game: z.enum(["WARZONE", "ROCKET_LEAGUE"]).optional(),
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

function backTo(game: MixGame) {
  return game === "ROCKET_LEAGUE"
    ? "/admin/mix/rocket-league"
    : "/admin/mix/warzone";
}

export async function createTempPlayer(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const parsed = createTempPlayerSchema.safeParse({
    game: String(formData.get("game") ?? "").trim().toUpperCase() || undefined,
    nickname: String(formData.get("nickname") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  // ✅ si pas de game, on retombe sur WARZONE par défaut
  const game: MixGame = parsed.success
    ? (parsed.data.game ?? "WARZONE")
    : "WARZONE";

  if (!parsed.success) {
    redirect(`${backTo(game)}?error=server`);
  }

  const nickname = parsed.data.nickname.trim();
  const note = parsed.data.note?.trim() || null;

  try {
    const existingTempPlayer = await db.tempPlayer.findFirst({
      where: {
        nickname: { equals: nickname, mode: "insensitive" },
        isAvailableForMix: true,
      },
      select: { id: true },
    });

    if (existingTempPlayer) {
      redirect(`${backTo(game)}?error=server`);
    }

    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { displayName: { equals: nickname, mode: "insensitive" } },
          { username: { equals: nickname.toLowerCase(), mode: "insensitive" } },
          { warzoneUsername: { equals: nickname, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      redirect(`${backTo(game)}?error=server`);
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
    if (isNextRedirectError(error)) throw error;
    console.error("CREATE_TEMP_PLAYER_ERROR", error);
    redirect(`${backTo(game)}?error=server`);
  }

  redirect(`${backTo(game)}?added=1`);
}