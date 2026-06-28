"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/classement", label: "Classement" },
    { href: "/gagnants", label: "Derniers Gagnants" },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/classement" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-cyan/10 border border-cyan/20 group-hover:border-cyan/50 transition-colors">
              <Plane className="h-5 w-5 text-cyan" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
                TraaaKe
              </span>
              <span className="hidden sm:block text-xs text-text-muted">
                Concours Screenshot
              </span>
            </div>
          </Link>

          {/* Nav + badge */}
          <div className="flex items-center gap-6">
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "text-text-primary bg-surface-2"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Badge variant="open" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              OUVERT
            </Badge>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden gap-1 pb-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "text-text-primary bg-surface-2"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
