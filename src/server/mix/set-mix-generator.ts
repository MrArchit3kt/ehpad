"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

type MixGame = "WARZONE" | "ROCKET_LEAGUE";
type RLTeamSize = "TWO" | "THREE";

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function gameFrom(v: unknown): MixGame | null {
  if (typeof v !== "string") return null;
  const g = v.trim().toUpperCase();
  if (g === "WARZONE" || g === "ROCKET_LEAGUE") return g as MixGame;
  return null;
}

function rlTeamSizeFrom(v: unknown): RLTeamSize | null {
  if (typeof v !== "string") return null;
  const x = v.trim().toUpperCase();
  if (x === "TWO" || x === "THREE") return x as RLTeamSize;
  return null;
}

export async function setMixGenerator(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const game = gameFrom(formData.get("game"));
  if (!game) redirect("/admin");

  const selectedAdminId = String(formData.get("selectedAdminId") ?? "").trim();
  const rlTeamSize = rlTeamSizeFrom(formData.get("rlTeamSize"));

  const backTo =
    game === "WARZONE" ? "/admin/mix/warzone" : "/admin/mix/rocket-league";

  try {
    // Rocket League : exiger un format si on set (ou si on veut générer derrière)
    if (game === "ROCKET_LEAGUE") {
      // si on clear l'admin, on autorise de clear le format aussi (optionnel)
      // ici : on garde le format si présent, sinon on le met à null
      // -> tu peux changer selon préférence
    }

    // ✅ CLEAR sélection admin
    if (!selectedAdminId) {
      await db.mixGenerationLock.upsert({
        where: { game },
        create: {
          game,
          selectedUserId: null,
          rocketLeagueTeamSize: game === "ROCKET_LEAGUE" ? (rlTeamSize ?? null) : null,
        },
        update: {
          selectedUserId: null,
          ...(game === "ROCKET_LEAGUE"
            ? { rocketLeagueTeamSize: rlTeamSize ?? null }
            : {}),
        },
      });

      redirect(`${backTo}?lock_cleared=1`);
    }

    // ✅ Vérifie user cible
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

    if (!selectedAdmin) redirect(`${backTo}?error=server`);

    const allowedRoles = ["ADMIN", "SUPER_ADMIN"];
    if (
      !allowedRoles.includes(selectedAdmin.role) ||
      selectedAdmin.status !== "ACTIVE" ||
      selectedAdmin.registrationStatus !== "APPROVED"
    ) {
      redirect(`${backTo}?error=server`);
    }

    // ✅ RL : exige le choix 2v2/3v3 quand on enregistre
    if (game === "ROCKET_LEAGUE" && !rlTeamSize) {
      redirect(`${backTo}?error=no_team_size`);
    }

    await db.mixGenerationLock.upsert({
      where: { game },
      create: {
        game,
        selectedUserId: selectedAdmin.id,
        rocketLeagueTeamSize: game === "ROCKET_LEAGUE" ? rlTeamSize : null,
      },
      update: {
        selectedUserId: selectedAdmin.id,
        ...(game === "ROCKET_LEAGUE" ? { rocketLeagueTeamSize: rlTeamSize } : {}),
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("SET_MIX_GENERATOR_ERROR", error);
    redirect(`${backTo}?error=server`);
  }

  redirect(`${backTo}?lock_set=1`);
}