export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ProfileAutoRefresh } from "@/components/profil/profile-auto-refresh";
import { requireAuth } from "@/server/auth/session";
import { db } from "@/lib/prisma";
import { updateProfile } from "@/server/profil/update-profile";
import { toggleMixAvailability } from "@/server/mix/toggle-mix-availability";
import { generateMix } from "@/server/mix/generate-mix";

type MixGame = "WARZONE" | "WARZONE_RANKED" | "ROCKET_LEAGUE";

function getErrorMessage(error?: string) {
  switch (error) {
    case "validation":
      return "Le formulaire est invalide. Vérifie les champs.";
    case "server":
      return "Erreur serveur pendant l’action demandée. Réessaie.";
    case "banned":
      return "Compte banni. Action impossible.";

    // Mix (commun)
    case "forbidden":
      return "Action non autorisée.";
    case "invalid_count":
      return "Nombre de joueurs invalide pour générer des équipes.";

    // Locks / sélection admin
    case "locked":
      return "Un autre générateur est actuellement sélectionné. Tu ne peux pas générer.";
    case "no_mix_admin":
      return "Un admin est en ligne : la génération est verrouillée tant qu’un générateur n’est pas sélectionné.";

    // Rocket League
    case "rank_missing":
      return "Certains joueurs n’ont pas de rang Rocket League renseigné : génération impossible.";
    case "rank_gap":
      return "Impossible de créer des teams Rocket League : écart de rang trop important dans les combinaisons.";

    // Warzone Ranked
    case "ranked_invalid_count":
      return "Warzone Ranked : mix en 3v3 uniquement → il faut un nombre de joueurs divisible par 3.";

    default:
      return null;
  }
}

function getBadgeClass(active: boolean) {
  return active
    ? "inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"
    : "inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/70";
}

/* ===========================
   TEAM NAMES (30 + 30)
   =========================== */

const WARZONE_TEAM_NAMES = [
    "Les Paras en Pantoufles",
    "La Squad du Frigo",
    "Les Snipers du Dimanche",
    "Les Balles Perdues",
    "Le Cartel des Pingouins",
    "Les Moustiques OP",
    "Les Fantômes du Gulag",
    "Les Tacticiens Égarés",
    "Les Croissants Commando",
    "La Brigade du Tilt",
    "Les Boucliers en Carton",
    "Les Ninjas du Lobby",
    "Les Pixels Vénères",
    "Les Pépites du Drop",
    "Les Grenades Poétiques",
    "La Team Pas Vu Pas Pris",
    "Les Loups du Toit",
    "Les Chasseurs de Loadout",
    "Les Snipers Mal Lunés",
    "Les Rois du Repli",
    "Les Caméléons du Smoke",
    "Les Roquettes du Placard",
    "Les Croutons Tactiques",
    "Les Saboteurs Gentils",
    "Les Dodos du Circle",
    "Les Pistaches Furtives",
    "Les Chevaliers du Ping",
    "La Patrouille du UAV",
    "Les Chèvres Galactiques",
    "Les Champs de Mines",
    "Les Alchimistes du Loot",
    "Les Pêcheurs de Plaques",
    "Les Bâtisseurs de Cover",
    "Les Monstres du Mini-Map",
    "Les VIP du Buy Station",
    "Les Architectes du Recul",
    "Les Pilotes de Drone",
    "Les Rois du Rebond",
    "Les Pros du Ping",
    "Les Discrets du Bruit",
    "Les Grincheux du Gaz",
    "Les Danseurs de Slide",
    "Les Survivants du Toit",
    "Les Poussins du Push",
    "Les Maîtres du Flanc",
    "Les Corsaires du Contrat",
    "Les Barons du Ballon",
    "Les Asticots du Smoke",
    "Les Gardiens du Loader",
    "Les Poètes du Plastron",
    "Les Glisseurs du Couloir",
    "Les Cafetiers du Combat",
    "Les Contournements Express",
    "Les Trappeurs du Tunnel",
    "Les Gourmettes du Loot",
    "Les Sorciers du Son",
    "Les Éclaireurs du Circle",
    "Les Pickups de Fortune",
    "Les Grands Stratèges",
    "Les Frères du Rebond",
    "Les Pingouins Parachutistes",
    "Les Lamas du Lobby",
    "Les Panda Paraboles",
    "Les Licornes Tactiques",
    "Les Chaussettes de Guerre",
    "Les Casques Croquants",
    "Les Briques Silencieuses",
    "Les Bananas Blindées",
    "Les Tortues Turbo",
    "Les Renards Radar",
    "Les Hiboux du Headshot",
    "Les Marmottes du Midgame",
    "Les Lynx du Loot",
    "Les Phoques en Plaques",
    "Les Hamsters Héroïques",
    "Les Koalas du Killfeed",
    "Les Chacals du Champ",
    "Les Aigles du Toit",
    "Les Corbeaux du Smoke",
    "Les Rorquals du Repli",
    "La Compagnie du Contrat",
    "La Section Bounty",
    "La Team Recon Relax",
    "Le Bureau des UAV",
    "La Firme des Flancs",
    "La Guilde du Gulag",
    "La Confrérie du Circle",
    "Le Syndicat du Slide",
    "L’Escadron du Buy",
    "La Brigade du Drop",
    "La Troupe du Timing",
    "La Clique du Cover",
    "Le Club des Plaques",
    "Les Amis du Loadout",
    "Les Artisans du Push",
    "Les Pros du Reset",
    "Les As du Self-Revive",
    "Les Virtuoses du Recoil",
    "Les Rois du Reposition",
    "Les Champions du Callout",
    "Les Vents du Flanc",
    "Les Ombres du Sud",
    "Les Éclats du Nord",
    "Les Étoiles du Toit",
    "Les Lueurs du Smoke",
    "Les Orages du Push",
    "Les Brumes du Mid",
    "Les Comètes du Drop",
    "Les Aurores du Repli",
    "Les Éclaireurs d’Argent",
    "Les Potes du Ping",
    "Les Copains du Circle",
    "Les Gardiens du Good Vibes",
    "Les Frags Sympas",
    "Les Aimants à Loot",
    "Les Calmes du Chaos",
    "Les Sages du Sprint",
    "Les Jokers du Jump",
    "Les Experts du “On y va”",
    "Les Légendes du “Je couvre”",
] as const;

const ROCKET_TEAM_NAMES = [
  "Les Boost Addicts",
  "Les Bump Diplomates",
  "Les Flips de la Chance",
  "Les Aériens du Dimanche",
  "Les Dribbleurs Timides",
  "La Brigade du Backboard",
  "Les Rotations Fantômes",
  "Les Cônes Volants",
  "Les Pivots Électriques",
  "Les Platinés Pressés",
  "Les Diamants Distraits",
  "Les Champions de Salon",
  "Les SSL du Déni",
  "Les Boosters Compulsifs",
  "Les Touches Trop Fortes",
  "Les Passes Inattendues",
  "Les Murs Magnétiques",
  "Les Rebondisseurs Pros",
  "Les Roues Souriantes",
  "Les Carrosseries Zen",
  "Les Balleux Poli(e)s",
  "Les Ailes en Plastique",
  "La Team 50/50",
  "Les Défenseurs Rêveurs",
  "Les Attaquants Patients",
  "Les Dunks Respectueux",
  "Les Double-Taps Discrets",
  "Les Kickoffs Calmes",
  "Les Freestylers Sages",
  "Les Rockets Rigolos",
] as const;

function hashToIndex(input: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return modulo === 0 ? 0 : hash % modulo;
}

function getTeamDisplayName(params: {
  game: MixGame;
  sessionId: string;
  teamNumber: number;
}) {
  const base = `${params.game}:${params.sessionId}:${params.teamNumber}`;
  if (params.game === "ROCKET_LEAGUE") {
    return ROCKET_TEAM_NAMES[hashToIndex(base, ROCKET_TEAM_NAMES.length)];
  }
  // WARZONE + WARZONE_RANKED -> mêmes noms, c'est ok
  return WARZONE_TEAM_NAMES[hashToIndex(base, WARZONE_TEAM_NAMES.length)];
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const sessionUser = await requireAuth();
  if (!sessionUser) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
  });
  if (!user) redirect("/login");

  // ✅ Dernière team WARZONE
  const latestWarzoneTeamMember = await db.teamMember.findFirst({
    where: {
      userId: user.id,
      team: { session: { game: "WARZONE" } },
    },
    orderBy: { addedAt: "desc" },
    include: {
      team: {
        include: {
          session: true,
          members: {
            orderBy: { addedAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  warzoneUsername: true,
                  platform: true,
                  rocketLeagueRank: true,
                },
              },
              tempPlayer: { select: { id: true, nickname: true, note: true } },
            },
          },
        },
      },
    },
  });

  // ✅ Dernière team WARZONE_RANKED
  const latestWarzoneRankedTeamMember = await db.teamMember.findFirst({
    where: {
      userId: user.id,
      team: { session: { game: "WARZONE_RANKED" } },
    },
    orderBy: { addedAt: "desc" },
    include: {
      team: {
        include: {
          session: true,
          members: {
            orderBy: { addedAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  warzoneUsername: true,
                  platform: true,
                  rocketLeagueRank: true,
                },
              },
              tempPlayer: { select: { id: true, nickname: true, note: true } },
            },
          },
        },
      },
    },
  });

  // ✅ Dernière team ROCKET LEAGUE
  const latestRocketTeamMember = await db.teamMember.findFirst({
    where: {
      userId: user.id,
      team: { session: { game: "ROCKET_LEAGUE" } },
    },
    orderBy: { addedAt: "desc" },
    include: {
      team: {
        include: {
          session: true,
          members: {
            orderBy: { addedAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  warzoneUsername: true,
                  platform: true,
                  rocketLeagueRank: true,
                },
              },
              tempPlayer: { select: { id: true, nickname: true, note: true } },
            },
          },
        },
      },
    },
  });

  const warzoneTeam = latestWarzoneTeamMember?.team ?? null;
  const warzoneRankedTeam = latestWarzoneRankedTeamMember?.team ?? null;
  const rocketTeam = latestRocketTeamMember?.team ?? null;

  const sp = (await searchParams) ?? {};
  const errorMessage = getErrorMessage(sp.error);
  const isSuccess = sp.success === "1";

  const isInWarzoneQueue = !!user.isAvailableForWarzoneMix;
  const isInWarzoneRankedQueue = !!(user as any).isAvailableForWarzoneRankedMix;
  const isInRocketQueue = !!user.isAvailableForRocketLeagueMix;

  // ✅ label file active (priorité ranked > normal > RL si tu veux)
  const activeQueueLabel = isInWarzoneRankedQueue
    ? "Warzone Ranked"
    : isInWarzoneQueue
      ? "Warzone"
      : isInRocketQueue
        ? "Rocket League"
        : null;

  return (
    <SiteShell>
      <ProfileAutoRefresh intervalMs={5000} />

      <div className="grid gap-6">
        {/* HEADER */}
        <div className="neon-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
            Profil
          </p>
          <h2 className="neon-title neon-gradient-text mt-3 text-3xl font-black">
            Mon profil joueur
          </h2>
          <p className="neon-text-muted mt-4 max-w-3xl leading-7">
            Gère ta présence dans les files (Warzone / Warzone Ranked / Rocket League),
            génère un mix si aucun admin n’est connecté, et consulte tes dernières équipes.
          </p>

          {activeQueueLabel ? (
            <p className="mt-4 text-sm text-white/80">
              File active : <span className="font-semibold text-white">{activeQueueLabel}</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-white/60">Tu n’es dans aucune file actuellement.</p>
          )}
        </div>

        {/* FEEDBACK */}
        {errorMessage ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-rose-400">{errorMessage}</p>
          </div>
        ) : null}

        {isSuccess ? (
          <div className="neon-card p-5">
            <p className="text-sm font-medium text-emerald-400">
              Profil mis à jour avec succès.
            </p>
          </div>
        ) : null}

        {/* ===================== */}
        {/* WARZONE NORMAL */}
        {/* ===================== */}
        <div className="grid gap-6">
          {/* QUEUE */}
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
              Warzone Mix (Normal)
            </p>

            <h3 className="mt-3 text-2xl font-bold text-white">
              {isInWarzoneQueue ? "En file Warzone" : "Hors file Warzone"}
            </h3>

            <p className="neon-text-muted mt-3 text-sm leading-6">
              Rejoins la file Warzone pour être pris en compte dans le mix normal.
              {isInWarzoneRankedQueue
                ? " Tu es en Ranked : rejoindre Warzone normal doit te retirer de la file Ranked."
                : isInRocketQueue
                  ? " Tu es dans Rocket League : rejoindre Warzone doit te retirer de l’autre file."
                  : ""}
            </p>

            <div className="mt-4">
              <span className={getBadgeClass(isInWarzoneQueue)}>
                {isInWarzoneQueue ? "Prêt (Warzone)" : "En attente"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <form action={toggleMixAvailability}>
                <input type="hidden" name="game" value="WARZONE" />
                <button
                  type="submit"
                  className={`w-full px-4 py-3 ${isInWarzoneQueue ? "neon-button-secondary" : "neon-button"}`}
                >
                  {isInWarzoneQueue ? "Quitter Warzone" : "Rejoindre Warzone"}
                </button>
              </form>

              <form action={generateMix}>
                <input type="hidden" name="game" value="WARZONE" />
                <button
                  type="submit"
                  className="neon-button-secondary w-full px-4 py-3"
                  disabled={!isInWarzoneQueue}
                  title={
                    isInWarzoneQueue
                      ? "Générer si autorisé (0 admin en ligne ou sélection lock)"
                      : "Rejoins la file Warzone pour pouvoir générer quand c’est permis"
                  }
                >
                  Générer (Warzone)
                </button>
              </form>
            </div>
          </div>

          {/* TEAM */}
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
              Mon équipe Warzone (Normal)
            </p>

            {warzoneTeam ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {getTeamDisplayName({
                        game: "WARZONE",
                        sessionId: warzoneTeam.session.id,
                        teamNumber: warzoneTeam.teamNumber,
                      })}
                    </h3>
                    <p className="mt-1 text-xs text-white/60">Équipe #{warzoneTeam.teamNumber}</p>
                  </div>

                  <span className="neon-badge">
                    Session {warzoneTeam.session.id.slice(-6).toUpperCase()}
                  </span>

                  <span className="neon-badge">
                    {warzoneTeam.members.length} joueur{warzoneTeam.members.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {warzoneTeam.members.map((member) => {
                    const memberName =
                      member.user?.displayName ?? member.tempPlayer?.nickname ?? "Joueur inconnu";
                    const memberSecondary = member.user?.username ? `@${member.user.username}` : "Joueur temporaire";
                    const memberWarzone =
                      member.user?.warzoneUsername ?? member.tempPlayer?.nickname ?? "Non renseigné";
                    const memberPlatform = member.user?.platform ?? "Temporaire";

                    return (
                      <div key={member.id} className="neon-card-soft p-4">
                        <p className="font-semibold text-white">{memberName}</p>
                        <p className="neon-text-muted mt-1 text-sm">{memberSecondary}</p>
                        <p className="neon-text-muted mt-2 text-sm">
                          Warzone : <span className="text-white">{memberWarzone}</span>
                        </p>
                        <p className="neon-text-muted mt-1 text-sm">
                          Plateforme : <span className="text-white">{memberPlatform}</span>
                        </p>
                        {member.tempPlayer?.note ? (
                          <p className="neon-text-muted mt-2 text-xs">
                            Note : <span className="text-white">{member.tempPlayer.note}</span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="neon-text-muted mt-4 text-sm">Aucune équipe Warzone pour le moment.</p>
            )}
          </div>
        </div>

        {/* ===================== */}
        {/* WARZONE RANKED */}
        {/* ===================== */}
        <div className="grid gap-6">
          {/* QUEUE */}
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300/75">
              Warzone Ranked (Classé)
            </p>

            <h3 className="mt-3 text-2xl font-bold text-white">
              {isInWarzoneRankedQueue ? "En file Warzone Ranked" : "Hors file Warzone Ranked"}
            </h3>

            <p className="neon-text-muted mt-3 text-sm leading-6">
              Le Ranked est en 3v3 maximum : les équipes doivent être formées uniquement par 3.
              {isInWarzoneQueue
                ? " Tu es en Warzone normal : rejoindre Ranked doit te retirer de la file normal."
                : isInRocketQueue
                  ? " Tu es dans Rocket League : rejoindre Ranked doit te retirer de l’autre file."
                  : ""}
            </p>

            <div className="mt-4">
              <span className={getBadgeClass(isInWarzoneRankedQueue)}>
                {isInWarzoneRankedQueue ? "Prêt (Ranked)" : "En attente"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <form action={toggleMixAvailability}>
                <input type="hidden" name="game" value="WARZONE_RANKED" />
                <button
                  type="submit"
                  className={`w-full px-4 py-3 ${
                    isInWarzoneRankedQueue ? "neon-button-secondary" : "neon-button"
                  }`}
                >
                  {isInWarzoneRankedQueue ? "Quitter Ranked" : "Rejoindre Ranked"}
                </button>
              </form>

              <form action={generateMix}>
                <input type="hidden" name="game" value="WARZONE_RANKED" />
                <button
                  type="submit"
                  className="neon-button-secondary w-full px-4 py-3"
                  disabled={!isInWarzoneRankedQueue}
                  title={
                    isInWarzoneRankedQueue
                      ? "Générer si autorisé (0 admin en ligne ou sélection lock)"
                      : "Rejoins la file Ranked pour pouvoir générer quand c’est permis"
                  }
                >
                  Générer (Ranked)
                </button>
              </form>
            </div>

            <p className="neon-text-muted mt-4 text-xs leading-6">
              Ranked : génération possible si autorisé (lock admin) ou s’il n’y a aucun admin connecté.
            </p>
          </div>

          {/* TEAM */}
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300/75">
              Mon équipe Warzone Ranked
            </p>

            {warzoneRankedTeam ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {getTeamDisplayName({
                        game: "WARZONE_RANKED",
                        sessionId: warzoneRankedTeam.session.id,
                        teamNumber: warzoneRankedTeam.teamNumber,
                      })}
                    </h3>
                    <p className="mt-1 text-xs text-white/60">
                      Équipe #{warzoneRankedTeam.teamNumber}
                    </p>
                  </div>

                  <span className="neon-badge">
                    Session {warzoneRankedTeam.session.id.slice(-6).toUpperCase()}
                  </span>

                  <span className="neon-badge">
                    {warzoneRankedTeam.members.length} joueur
                    {warzoneRankedTeam.members.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {warzoneRankedTeam.members.map((member) => {
                    const memberName =
                      member.user?.displayName ?? member.tempPlayer?.nickname ?? "Joueur inconnu";
                    const memberSecondary = member.user?.username ? `@${member.user.username}` : "Joueur temporaire";
                    const memberWarzone =
                      member.user?.warzoneUsername ?? member.tempPlayer?.nickname ?? "Non renseigné";
                    const memberPlatform = member.user?.platform ?? "Temporaire";

                    return (
                      <div key={member.id} className="neon-card-soft p-4">
                        <p className="font-semibold text-white">{memberName}</p>
                        <p className="neon-text-muted mt-1 text-sm">{memberSecondary}</p>
                        <p className="neon-text-muted mt-2 text-sm">
                          Warzone : <span className="text-white">{memberWarzone}</span>
                        </p>
                        <p className="neon-text-muted mt-1 text-sm">
                          Plateforme : <span className="text-white">{memberPlatform}</span>
                        </p>
                        {member.tempPlayer?.note ? (
                          <p className="neon-text-muted mt-2 text-xs">
                            Note : <span className="text-white">{member.tempPlayer.note}</span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="neon-text-muted mt-4 text-sm">Aucune équipe Ranked pour le moment.</p>
            )}
          </div>
        </div>

        {/* ===================== */}
        {/* ROCKET LEAGUE */}
        {/* ===================== */}
        <div className="grid gap-6">
          {/* QUEUE */}
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
              Rocket League Mix
            </p>

            <h3 className="mt-3 text-2xl font-bold text-white">
              {isInRocketQueue ? "En file Rocket League" : "Hors file Rocket League"}
            </h3>

            <p className="neon-text-muted mt-3 text-sm leading-6">
              Mix Rocket League : format selon sélection admin (2v2 / 3v3) + contrainte de rang.
              {isInWarzoneQueue || isInWarzoneRankedQueue
                ? " Tu es dans une file Warzone : rejoindre Rocket League doit te retirer des files Warzone."
                : ""}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={getBadgeClass(isInRocketQueue)}>
                {isInRocketQueue ? "Prêt (RL)" : "En attente"}
              </span>

              <span className="neon-badge">
                Rang : {user.rocketLeagueRank ?? "Non renseigné"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <form action={toggleMixAvailability}>
                <input type="hidden" name="game" value="ROCKET_LEAGUE" />
                <button
                  type="submit"
                  className={`w-full px-4 py-3 ${isInRocketQueue ? "neon-button-secondary" : "neon-button"}`}
                >
                  {isInRocketQueue ? "Quitter Rocket League" : "Rejoindre Rocket League"}
                </button>
              </form>

              <form action={generateMix}>
                <input type="hidden" name="game" value="ROCKET_LEAGUE" />
                <button
                  type="submit"
                  className="neon-button-secondary w-full px-4 py-3"
                  disabled={!isInRocketQueue}
                >
                  Générer (RL)
                </button>
              </form>
            </div>
          </div>

          {/* TEAM */}
          <div className="neon-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
              Mon équipe Rocket League
            </p>

            {rocketTeam ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {getTeamDisplayName({
                        game: "ROCKET_LEAGUE",
                        sessionId: rocketTeam.session.id,
                        teamNumber: rocketTeam.teamNumber,
                      })}
                    </h3>
                    <p className="mt-1 text-xs text-white/60">Équipe #{rocketTeam.teamNumber}</p>
                  </div>

                  <span className="neon-badge">
                    Session {rocketTeam.session.id.slice(-6).toUpperCase()}
                  </span>

                  <span className="neon-badge">
                    {rocketTeam.members.length} joueur{rocketTeam.members.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {rocketTeam.members.map((member) => {
                    const memberName =
                      member.user?.displayName ?? member.tempPlayer?.nickname ?? "Joueur inconnu";
                    const memberSecondary = member.user?.username ? `@${member.user.username}` : "Joueur temporaire";
                    const memberRank = member.user?.rocketLeagueRank ?? "Rang non renseigné";

                    return (
                      <div key={member.id} className="neon-card-soft p-4">
                        <p className="font-semibold text-white">{memberName}</p>
                        <p className="neon-text-muted mt-1 text-sm">{memberSecondary}</p>
                        <p className="neon-text-muted mt-2 text-sm">
                          Rang RL : <span className="text-white">{memberRank}</span>
                        </p>
                        {member.tempPlayer?.note ? (
                          <p className="neon-text-muted mt-2 text-xs">
                            Note : <span className="text-white">{member.tempPlayer.note}</span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="neon-text-muted mt-4 text-sm">Aucune équipe Rocket League pour le moment.</p>
            )}
          </div>
        </div>

        {/* ===================== */}
        {/* MODIFIER MES INFOS */}
        {/* ===================== */}
        <details className="neon-card overflow-hidden p-0 group">
          <summary className="cursor-pointer list-none p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                  Profil
                </p>
                <h3 className="mt-2 text-xl font-bold text-white">
                  Modifier mes informations
                </h3>
                <p className="neon-text-muted mt-2 text-sm">
                  Clique pour ouvrir / fermer le formulaire.
                </p>
              </div>

              <span className="text-white/70 transition-transform duration-200 group-open:rotate-180">
                ▼
              </span>
            </div>
          </summary>

          <div className="border-t border-white/8 p-6 md:p-8">
            <form action={updateProfile} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Nom affiché
                </label>
                <input
                  name="displayName"
                  type="text"
                  required
                  defaultValue={user.displayName}
                  className="w-full px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 opacity-70"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Pseudo Warzone
                </label>
                <input
                  name="warzoneUsername"
                  type="text"
                  required
                  defaultValue={user.warzoneUsername}
                  className="w-full px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Activision ID
                </label>
                <input
                  name="activisionId"
                  type="text"
                  defaultValue={user.activisionId ?? ""}
                  placeholder="Pseudo#1234567"
                  className="w-full px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Plateforme
                </label>
                <select
                  name="platform"
                  defaultValue={user.platform ?? ""}
                  className="w-full px-4 py-3"
                >
                  <option value="">Choisir</option>
                  <option value="PC">PC</option>
                  <option value="PS5">PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="XBOX_SERIES">Xbox Series</option>
                  <option value="XBOX_ONE">Xbox One</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Rôle préféré (Warzone)
                </label>
                <select
                  name="preferredRole"
                  defaultValue={user.preferredRole ?? "NONE"}
                  className="w-full px-4 py-3"
                >
                  <option value="NONE">Aucun</option>
                  <option value="RUSH">Rush</option>
                  <option value="SUPPORT">Support</option>
                  <option value="SNIPE">Snipe</option>
                  <option value="FLEX">Flex</option>
                  <option value="IGL">IGL</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Rang Rocket League
                </label>
                <select
                  name="rocketLeagueRank"
                  defaultValue={user.rocketLeagueRank ?? ""}
                  className="w-full px-4 py-3"
                >
                  <option value="">Non renseigné</option>
                  <option value="BRONZE">Bronze</option>
                  <option value="SILVER">Argent</option>
                  <option value="GOLD">Or</option>
                  <option value="PLATINUM">Platine</option>
                  <option value="DIAMOND">Diamant</option>
                  <option value="CHAMPION">Champion</option>
                  <option value="GRAND_CHAMPION">Grand Champion</option>
                  <option value="SSL">SSL</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Discord
                </label>
                <input
                  name="discordUsername"
                  type="text"
                  defaultValue={user.discordUsername ?? ""}
                  placeholder="pseudo_discord"
                  className="w-full px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  WhatsApp
                </label>
                <input
                  name="whatsappNumber"
                  type="text"
                  defaultValue={user.whatsappNumber ?? ""}
                  placeholder="+33600000000"
                  className="w-full px-4 py-3"
                />
              </div>

              <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <input
                    name="micAvailable"
                    type="checkbox"
                    defaultChecked={user.micAvailable}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-white">Micro disponible</span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <input
                    name="whatsappOptIn"
                    type="checkbox"
                    defaultChecked={user.whatsappOptIn}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-white">
                    J’accepte les notifications WhatsApp
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <button type="submit" className="neon-button w-full px-4 py-3">
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </details>
      </div>
    </SiteShell>
  );
}