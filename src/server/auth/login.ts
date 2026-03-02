"use server";

import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=credentials");
  }

  redirect("/login");
}