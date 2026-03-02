export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireAuth } from "@/server/auth/session";

export default async function DashboardPage() {
  const user = await requireAuth();

  if (!user) {
    redirect("/login");
  }

  redirect("/profil");
}