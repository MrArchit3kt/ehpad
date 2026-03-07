"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";
import type { UserRole } from "@/generated/prisma";

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

function redirectTo(game: MixGame, qs: string) {
  const backTo =
    game === "WARZONE" ? "/admin/mix/warzone" : "/admin/mix/rocket-league";
  redirect(`${backTo}${qs}`);
}

export async function setMixGenerator(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const game = gameFrom(formData.get("game")) ?? "WARZONE";
  const selectedAdminId = String(formData.get("selectedAdminId") ?? "").trim();
  const rlTeamSize = rlTeamSizeFrom(formData.get("rlTeamSize"));

  try {
    // ✅ CLEAR sélection
    if (!selectedAdminId) {
      await db.mixGenerationLock.upsert({
        where: { game },
        create: {
          game,
          selectedUserId: null,
          rocketLeagueTeamSize:
            game === "ROCKET_LEAGUE" ? (rlTeamSize ?? null) : null,
        },
        update: {
          selectedUserId: null,
          ...(game === "ROCKET_LEAGUE"
            ? { rocketLeagueTeamSize: rlTeamSize ?? null }
            : {}),
        },
      });

      return redirectTo(game, "?lock_cleared=1");
    }

    const selectedAdmin = await db.user.findUnique({
      where: { id: selectedAdminId },
      select: {
        id: true,
        role: true,
        status: true,
        registrationStatus: true,
      },
    });

    if (!selectedAdmin) {
      return redirectTo(game, "?error=server");
    }

    // ✅ Fix TS: on utilise un Set<UserRole>
    const allowedRoles = new Set<UserRole>(["ADMIN", "SUPER_ADMIN"]);

    if (
      !allowedRoles.has(selectedAdmin.role) ||
      selectedAdmin.status !== "ACTIVE" ||
      selectedAdmin.registrationStatus !== "APPROVED"
    ) {
      return redirectTo(game, "?error=server");
    }

    // ✅ RL : exige le choix 2v2/3v3 quand on enregistre
    if (game === "ROCKET_LEAGUE" && !rlTeamSize) {
      return redirectTo(game, "?error=no_team_size");
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

    return redirectTo(game, "?lock_set=1");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("SET_MIX_GENERATOR_ERROR", error);
    return redirectTo(game, "?error=server");
  }
}