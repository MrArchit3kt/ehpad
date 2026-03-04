import Image from "next/image";
import Link from "next/link";
import {
  Home,
  Shield,
  CalendarDays,
  Bell,
  Settings,
  UserCircle2,
  Users,
  Share2,
  Mail,
  LayoutDashboard,
} from "lucide-react";
import { getSessionUser } from "@/server/auth/session";

const mainLinks = [
  {
    href: "/",
    label: "Accueil",
    icon: Home,
  },
  {
    href: "/profil",
    label: "Profil",
    icon: UserCircle2,
  },
  {
    href: "/events",
    label: "Événements",
    icon: CalendarDays,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/socials",
    label: "Réseaux",
    icon: Share2,
  },
  {
    href: "/contact",
    label: "Contact",
    icon: Mail,
  },
  {
    href: "/reglement",
    label: "Règlement",
    icon: Shield,
  },
];

const adminLinks = [
  {
    href: "/admin",
    label: "Admin",
    icon: Settings,
  },
  {
    href: "/admin/players",
    label: "Admin Players",
    icon: Users,
  },
  {
    href: "/admin/registrations",
    label: "Inscriptions",
    icon: Users,
  },
  {
    href: "/admin/mix",
    label: "Admin Mix",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/events",
    label: "Admin Events",
    icon: CalendarDays,
  },
  {
    href: "/admin/reglement",
    label: "Admin Règlement",
    icon: Shield,
  },
  {
    href: "/admin/contact",
    label: "Admin Contact",
    icon: Mail,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
  },
];

export async function SiteSidebar() {
  const user = await getSessionUser();
  const canSeeAdmin =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6">
        <div className="neon-card p-5">
          <div className="mb-6 border-b border-white/5 pb-5">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-cyan-400/20 bg-black/30">
                <Image
                  src="/images/ehpad-logo.png"
                  alt="Logo EHPAD"
                  fill
                  className="object-cover"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  EHPAD
                </p>
                <h2 className="neon-title neon-gradient-text text-lg font-black">
                  Squad Manager
                </h2>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Navigation
            </p>

            {mainLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-white/80 transition hover:border-cyan-400/15 hover:bg-white/[0.03] hover:text-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] transition group-hover:border-cyan-400/20 group-hover:bg-cyan-400/[0.06]">
                    <Icon className="h-4 w-4 text-cyan-300/90" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {canSeeAdmin ? (
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Administration
              </p>

              <div className="space-y-2">
                {adminLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-white/75 transition hover:border-pink-400/15 hover:bg-white/[0.03] hover:text-white"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] transition group-hover:border-pink-400/20 group-hover:bg-pink-400/[0.06]">
                        <Icon className="h-4 w-4 text-pink-300/90" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}