"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Settings,
  History,
  ExternalLink,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/concours", label: "Concours", icon: Trophy },
  { href: "/admin/environnements", label: "Environnements", icon: Server },
  { href: "/admin/reglages", label: "Réglages", icon: Settings },
  { href: "/admin/historique", label: "Historique", icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 h-screen glass border-r border-border fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan/20 flex-shrink-0">
          <Image src="/logo.png" alt="TraaaKe logo" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="text-lg font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
            TraaaKe
          </span>
          <p className="text-xs text-text-muted">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-cyan/10 border border-cyan/20 text-cyan"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-text-secondary">Bot en ligne</span>
        </div>
        <Link
          href="/classement"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir le site public
        </Link>
      </div>
    </aside>
  );
}
