"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/prisma";

export async function logoutUser() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const sessionUser = session.user as { id?: string };

      if (sessionUser.id) {
        await db.user.update({
          where: { id: sessionUser.id },
          data: {
            isOnline: false,
            isAvailableForMix: false,
            lastSeenAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("LOGOUT_USER_ERROR", error);
  }

  redirect("/api/auth/signout?callbackUrl=/login");
}