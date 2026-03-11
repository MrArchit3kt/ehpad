"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/prisma";

const registerSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40),
    email: z.string().trim().email(),
    activisionId: z.string().trim().max(64).optional().or(z.literal("")),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    acceptRules: z.literal("on"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

function normalizeBaseUsername(displayName: string) {
  // -> "Pénélope AC2N" => "penelope_ac2n"
  const base = displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9]+/g, "_") // non alphanum => _
    .replace(/^_+|_+$/g, "") // trim _
    .slice(0, 20);

  return base.length >= 3 ? base : `player_${base || "ac2n"}`;
}

async function makeUniqueUsername(base: string) {
  // On tente base, puis base_1234, base_5678...
  let candidate = base;
  for (let i = 0; i < 12; i += 1) {
    const exists = await db.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;

    const suffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${base}_${suffix}`.slice(0, 24);
  }
  // dernier recours
  return `${base}_${Date.now().toString().slice(-4)}`.slice(0, 24);
}

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    activisionId: String(formData.get("activisionId") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    acceptRules: formData.get("acceptRules"),
  });

  if (!parsed.success) {
    redirect("/register?error=validation");
  }

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase().trim();

  try {
    const existingEmail = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingEmail) redirect("/register?error=email");

    const baseUsername = normalizeBaseUsername(data.displayName);
    const username = await makeUniqueUsername(baseUsername);

    // ✅ DB exige warzoneUsername => on fallback proprement
    const activisionId = data.activisionId?.trim() || null;
    const warzoneUsername = activisionId ? activisionId : data.displayName.trim();

    const activeRules = await db.rulesVersion.findFirst({
      where: { isActive: true },
      orderBy: { versionNumber: "desc" },
      select: { id: true },
    });

    const passwordHash = await hash(data.password, 12);

    await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: data.displayName.trim(),
        username, // ✅ généré
        warzoneUsername, // ✅ fallback
        activisionId, // ✅ optionnel
        role: "PLAYER",
        status: "INACTIVE",
        registrationStatus: "PENDING",
        acceptedRulesAt: new Date(),
        acceptedRulesVersionId: activeRules?.id ?? null,
      },
    });
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    redirect("/register?error=server");
  }

  redirect("/approval-pending");
}