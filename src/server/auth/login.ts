"use server";

import  AuthError  from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }

    throw error;
  }

  redirect("/dashboard");
}