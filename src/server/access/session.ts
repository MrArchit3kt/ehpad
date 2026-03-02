import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/server/access/constants";

export async function hasValidSiteAccess() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const expected = process.env.SITE_ACCESS_PASSWORD;

  if (!expected) {
    console.warn("SITE_ACCESS_PASSWORD is not set");
    return false;
  }

  return accessCookie === expected;
}