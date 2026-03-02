import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}