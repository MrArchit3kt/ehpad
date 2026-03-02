"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/prisma";

const registerSchema = z
  .object({
    displayName: z.string().min(2).max(40),
    username: z
      .string()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, "Username invalide"),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    warzoneUsername: z.string().min(2).max(40),
    acceptRules: z.literal("on"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    username: String(formData.get("username") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    warzoneUsername: String(formData.get("warzoneUsername") ?? ""),
    acceptRules: formData.get("acceptRules"),
  });

  if (!parsed.success) {
    redirect("/register?error=validation");
  }

  const { displayName, username, email, password, warzoneUsername } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedDisplayName = displayName.trim();
  const normalizedWarzoneUsername = warzoneUsername.trim();

  try {
    const existingEmail = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      redirect("/register?error=email");
    }

    const existingUsername = await db.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUsername) {
      redirect("/register?error=username");
    }

    const activeRules = await db.rulesVersion.findFirst({
      where: { isActive: true },
      orderBy: { versionNumber: "desc" },
    });

    const passwordHash = await hash(password, 12);

    await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: normalizedDisplayName,
        username: normalizedUsername,
        warzoneUsername: normalizedWarzoneUsername,
        role: "PLAYER",
        status: "ACTIVE",
        acceptedRulesAt: new Date(),
        acceptedRulesVersionId: activeRules?.id,
      },
    });
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    redirect("/register?error=server");
  }

  redirect("/login?registered=1");
}
