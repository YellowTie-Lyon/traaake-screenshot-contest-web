"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/features/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setLoading(false);
    }
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
            <Image src="/logo.png" alt="TraaaKe" width={48} height={48} className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
              TraaaKe
            </h1>
            <p className="text-sm text-text-muted mt-0.5">Récupération de mot de passe</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-8 border border-border space-y-6">
          {sent ? (
            <div className="text-center space-y-3">
              <Mail className="w-10 h-10 text-cyan mx-auto" />
              <p className="text-sm text-text-secondary">
                Un email de récupération a été envoyé à <strong>{email}</strong>.
              </p>
              <Link href="/auth/login" className="text-xs text-cyan hover:text-cyan-light transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Envoyer le lien
                </Button>
              </form>
              <div className="text-center">
                <Link href="/auth/login" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
