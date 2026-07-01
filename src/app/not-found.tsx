import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-8xl font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent mb-4">404</p>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Page introuvable</h1>
        <p className="text-text-muted mb-8">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link
          href="/classement"
          className="px-5 py-2.5 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan font-medium hover:bg-cyan/20 transition-colors"
        >
          Retour au classement
        </Link>
      </main>
      <Footer />
    </div>
  );
}
