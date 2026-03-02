import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";
import { SiDiscord, SiWhatsapp } from "react-icons/si";
import { db } from "@/lib/prisma";

export default async function SocialsPage() {
  const config = await db.siteConfig.findUnique({
    where: { id: "main" },
    select: {
      siteName: true,
      discordInviteUrl: true,
      whatsappInviteUrl: true,
      socialsEnabled: true,
    },
  });

  const siteName = config?.siteName ?? "EHPAD Squad Manager";
  const discordInviteUrl = config?.discordInviteUrl?.trim() ?? "";
  const whatsappInviteUrl = config?.whatsappInviteUrl?.trim() ?? "";
  const socialsEnabled = config?.socialsEnabled ?? true;

  return (
    <SiteShell>
      <div className="grid gap-6">
        <div className="neon-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
            Réseaux de la team
          </p>
          <h1 className="neon-title neon-gradient-text mt-3 text-3xl font-black">
            Rejoins la communauté {siteName.replace(" Squad Manager", "")}
          </h1>
          <p className="neon-text-muted mt-4 max-w-3xl leading-7">
            Retrouve les accès principaux de la team pour échanger, organiser les
            sessions et suivre la communauté.
          </p>
        </div>

        {!socialsEnabled ? (
          <div className="neon-card p-8">
            <p className="neon-text-muted text-sm">
              Les réseaux sont temporairement désactivés par l’administration.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="neon-card p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-indigo-400/20 bg-indigo-400/10">
                  <SiDiscord className="h-8 w-8 text-indigo-300" />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300/80">
                    Discord
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Serveur principal
                  </h2>
                </div>
              </div>

              <p className="neon-text-muted mt-5 text-sm leading-7">
                Rejoins le Discord de la team pour les vocales, l’organisation des
                games, les annonces et les échanges rapides.
              </p>

              <div className="mt-6">
                {discordInviteUrl ? (
                  <Link
                    href={discordInviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="neon-button inline-flex px-6 py-3"
                  >
                    Rejoindre Discord
                  </Link>
                ) : (
                  <span className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/70">
                    Lien Discord non configuré
                  </span>
                )}
              </div>
            </div>

            <div className="neon-card p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10">
                  <SiWhatsapp className="h-8 w-8 text-emerald-300" />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                    WhatsApp
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Groupe communautaire
                  </h2>
                </div>
              </div>

              <p className="neon-text-muted mt-5 text-sm leading-7">
                Accède au groupe WhatsApp pour les messages rapides, les rappels et
                les échanges hors session.
              </p>

              <div className="mt-6">
                {whatsappInviteUrl ? (
                  <Link
                    href={whatsappInviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="neon-button inline-flex px-6 py-3"
                  >
                    Rejoindre WhatsApp
                  </Link>
                ) : (
                  <span className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/70">
                    Lien WhatsApp non configuré
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}