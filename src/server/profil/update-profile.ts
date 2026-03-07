"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/session";

const rocketLeagueRankEnum = z.enum([
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "CHAMPION",
  "GRAND_CHAMPION",
  "SSL",
]);

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(40),
  warzoneUsername: z.string().min(2).max(40),
  activisionId: z.string().max(80).optional(),
  platform: z
    .enum(["PC", "PS5", "PS4", "XBOX_SERIES", "XBOX_ONE", "OTHER"])
    .optional(),
  preferredRole: z
    .enum(["RUSH", "SUPPORT", "SNIPE", "FLEX", "IGL", "NONE"])
    .optional(),
  discordUsername: z.string().max(80).optional(),
  whatsappNumber: z.string().max(30).optional(),
  micAvailable: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),

  // ✅ Rocket League
  rocketLeagueRank: rocketLeagueRankEnum.optional(),
});

function emptyToUndefined(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str === "" ? undefined : str;
}

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();

  if (!user) {
    redirect("/login");
  }

  // RL rank : on accepte "" => undefined
  const rlRankRaw = emptyToUndefined(formData.get("rocketLeagueRank"));

  const parsed = updateProfileSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    warzoneUsername: String(formData.get("warzoneUsername") ?? ""),
    activisionId: emptyToUndefined(formData.get("activisionId")),
    platform: emptyToUndefined(formData.get("platform")),
    preferredRole: emptyToUndefined(formData.get("preferredRole")),
    discordUsername: emptyToUndefined(formData.get("discordUsername")),
    whatsappNumber: emptyToUndefined(formData.get("whatsappNumber")),
    micAvailable: formData.get("micAvailable") === "on",
    whatsappOptIn: formData.get("whatsappOptIn") === "on",

    rocketLeagueRank: rlRankRaw as any, // validé par zod enum si présent
  });

  if (!parsed.success) {
    redirect("/profil?error=validation");
  }

  try {
    const data = parsed.data;

    await db.user.update({
      where: { id: user.id },
      data: {
        displayName: data.displayName.trim(),
        warzoneUsername: data.warzoneUsername.trim(),
        activisionId: data.activisionId,
        platform: data.platform,
        preferredRole: data.preferredRole ?? "NONE",
        discordUsername: data.discordUsername,
        whatsappNumber: data.whatsappNumber,
        micAvailable: Boolean(data.micAvailable),
        whatsappOptIn: Boolean(data.whatsappOptIn),

        // ✅ Rocket League
        rocketLeagueRank: data.rocketLeagueRank ?? null,
      },
    });
  } catch (error) {
    console.error("UPDATE_PROFILE_ERROR", error);
    redirect("/profil?error=server");
  }

  redirect("/profil?success=1");
}