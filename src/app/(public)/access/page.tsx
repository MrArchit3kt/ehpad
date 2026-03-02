import { redirect } from "next/navigation";
import { hasValidSiteAccess } from "@/server/access/session";
import { ACCESS_COOKIE_NAME } from "@/server/access/constants";
import { cookies } from "next/headers";

async function unlockSite(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");
  const expected = process.env.SITE_ACCESS_PASSWORD;

  if (!expected) {
    throw new Error("SITE_ACCESS_PASSWORD is missing in .env");
  }

  if (password !== expected) {
    redirect("/access?error=1");
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: ACCESS_COOKIE_NAME,
    value: expected,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const hasAccess = await hasValidSiteAccess();

  if (hasAccess) {
    redirect("/");
  }

  const sp = (await searchParams) ?? {};
  const showError = sp.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="neon-card p-7 md:p-8">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="neon-badge">Privé</span>
              <span className="neon-badge">EHPAD</span>
            </div>

            <h1 className="neon-title neon-gradient-text text-3xl font-black">
              Accès sécurisé
            </h1>

            <p className="neon-text-muted mt-3 text-sm leading-6">
              Le site est protégé par un mot de passe communautaire afin de bloquer
              les inscriptions spam et préserver la communauté.
            </p>
          </div>

          <form action={unlockSite} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-white"
              >
                Mot de passe d’accès
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Entre le mot de passe"
                className="w-full px-4 py-3"
              />
            </div>

            {showError ? (
              <p className="text-sm font-medium text-rose-400">
                Mot de passe incorrect. Accès refusé.
              </p>
            ) : null}

            <button
              type="submit"
              className="neon-button w-full px-4 py-3"
            >
              Entrer sur le site
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}