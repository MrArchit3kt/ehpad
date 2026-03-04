import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/prisma";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  status: string;
  registrationStatus: string;
};

async function resolveSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const sessionUser = session.user as { id?: string };

  if (!sessionUser.id) {
    return null;
  }

  const dbUser = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      username: true,
      role: true,
      status: true,
      registrationStatus: true,
    },
  });

  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.displayName,
    username: dbUser.username,
    role: dbUser.role,
    status: dbUser.status,
    registrationStatus: dbUser.registrationStatus,
  };
}

export async function getSessionUser() {
  try {
    return await resolveSessionUser();
  } catch (error) {
    console.error("GET_SESSION_USER_ERROR", error);
    return null;
  }
}

export async function requireAuth() {
  try {
    const user = await resolveSessionUser();

    if (!user) {
      return null;
    }

    if (user.registrationStatus === "PENDING") {
      redirect("/approval-pending");
    }

    if (user.registrationStatus === "REJECTED") {
      redirect("/approval-rejected");
    }

    if (user.status === "BANNED") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("REQUIRE_AUTH_ERROR", error);
    return null;
  }
}

export async function requireAdmin() {
  try {
    const user = await requireAuth();

    if (!user) {
      return null;
    }

    const allowed = ["ADMIN", "SUPER_ADMIN"];

    if (!allowed.includes(user.role)) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("REQUIRE_ADMIN_ERROR", error);
    return null;
  }
}