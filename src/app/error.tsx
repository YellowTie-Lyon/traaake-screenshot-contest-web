"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-8xl font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent mb-4">500</p>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Une erreur est survenue</h1>
        <p className="text-text-muted mb-8">Quelque chose s&apos;est mal passé. Tu peux réessayer ou revenir à l&apos;accueil.</p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan font-medium hover:bg-cyan/20 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/classement"
            className="px-5 py-2.5 rounded-lg border border-border text-text-secondary font-medium hover:bg-surface-2 transition-colors"
          >
            Retour au classement
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
