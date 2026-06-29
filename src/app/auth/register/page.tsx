"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/features/auth/api";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setLoading(true);
    try {
      const { user } = await signUp(email, password, displayName);
      if (user?.identities?.length === 0) {
        toast.error("Un compte existe déjà avec cet email");
        return;
      }
      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass rounded-2xl p-8 border border-border text-center space-y-4"
        >
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <h2 className="text-xl font-semibold text-text-primary">Vérifiez votre email</h2>
          <p className="text-sm text-text-muted">
            Un lien de confirmation a été envoyé à <strong className="text-text-secondary">{email}</strong>.
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Button variant="outline" onClick={() => router.push("/auth/login")} className="w-full">
            Retour à la connexion
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-cyan/20">
            <Image src="/logo.png" alt="TraKr" width={48} height={48} className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
              TraaaKe
            </h1>
            <p className="text-sm text-text-muted mt-0.5">Créez votre compte</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-8 border border-border space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d&apos;affichage</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="YellowTie"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>

          <div className="text-center text-sm text-text-muted">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-cyan hover:text-cyan-light transition-colors">
              Se connecter
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
