"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Trophy, Settings, History, ExternalLink,
  Bot, LogOut, ChevronDown, Users, ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/features/auth/hooks";
import { signOut } from "@/features/auth/api";
import { useState } from "react";
import type { TabSlug } from "@/lib/supabase/types";

const allNavItems: { href: string; label: string; icon: React.ElementType; exact?: boolean; slug: TabSlug }[] = [
  { href: "/gestion", label: "Dashboard", icon: LayoutDashboard, exact: true, slug: "dashboard" },
  { href: "/gestion/concours", label: "Concours", icon: Trophy, slug: "concours" },
  { href: "/gestion/membres", label: "Membres", icon: Users, slug: "membres" },
  { href: "/gestion/bans", label: "Bans", icon: ShieldOff, slug: "bans" },
  { href: "/gestion/discord", label: "Intégration Discord", icon: Bot, slug: "discord" },
  { href: "/gestion/reglages", label: "Réglages", icon: Settings, slug: "reglages" },
  { href: "/gestion/historique", label: "Historique", icon: History, slug: "historique" },
];

const roleLabel: Record<string, string> = {
  owner: "Propriétaire",
  administrator: "Administrateur",
  moderator: "Modérateur",
  viewer: "Observateur",
};

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isOwner = profile?.role === 'owner';

  // Filter nav items by permissions
  const navItems = allNavItems.filter(item =>
    isOwner || (profile?.allowed_tabs ?? []).includes(item.slug)
  );

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/auth/login");
    } finally {
      setSigningOut(false);
    }
  }

  const displayName = profile?.display_name ?? profile?.discord_display_name ?? "Utilisateur";
  const avatarUrl = profile?.discord_avatar_url;

  return (
    <aside className="flex flex-col w-64 h-screen glass border-r border-border fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan/20 flex-shrink-0">
          <Image src="/logo.png" alt="TraKr logo" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="text-lg font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
            TraaaKe
          </span>
          <p className="text-xs text-text-muted">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active ? "bg-cyan/10 border border-cyan/20 text-cyan" : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Utilisateurs — owner only, not in allNavItems permission filter */}
        {isOwner && (
          <Link href="/gestion/utilisateurs"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              pathname.startsWith("/gestion/utilisateurs") ? "bg-cyan/10 border border-cyan/20 text-cyan" : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            )}
          >
            <Users className="h-4 w-4" />
            Utilisateurs admin
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <Link href="/classement"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir le site public
        </Link>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setUserMenuOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName} width={28} height={28} className="rounded-full border border-border flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-cyan">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{displayName}</p>
              {profile?.role && <p className="text-[10px] text-text-muted">{roleLabel[profile.role] ?? profile.role}</p>}
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0", userMenuOpen && "rotate-180")} />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 glass border border-border rounded-lg overflow-hidden shadow-lg">
              <button onClick={handleSignOut} disabled={signingOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut ? "Déconnexion..." : "Se déconnecter"}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
