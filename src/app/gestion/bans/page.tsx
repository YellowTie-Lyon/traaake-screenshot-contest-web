"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Shield, ShieldOff, Clock, Loader2, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getEnvironments } from "@/features/environments/api";
import { getActiveBans, getAllBans, liftBan, type DbContestBan } from "@/features/bans/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function isExpired(ban: DbContestBan) {
  if (!ban.expires_at) return false;
  return new Date(ban.expires_at) <= new Date();
}

function BanRow({ ban, onLift, lifting }: { ban: DbContestBan; onLift: (id: string) => void; lifting: boolean }) {
  const permanent = !ban.expires_at;
  const expired = isExpired(ban);
  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
      expired ? 'border-border bg-surface-2/30 opacity-60' : 'border-red-500/20 bg-red-500/5'
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        <ShieldOff className={`w-5 h-5 ${expired ? 'text-text-muted' : 'text-red-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium text-text-primary">{ban.discord_username}</span>
          <span className="text-xs text-text-muted font-mono">{ban.discord_user_id}</span>
          {permanent && !expired && (
            <span className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 rounded px-1.5 py-0.5">Permanent</span>
          )}
          {expired && (
            <span className="text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5">Expiré</span>
          )}
        </div>
        {ban.reason && (
          <p className="text-sm text-text-secondary mb-1">Raison : {ban.reason}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
          <span>Banni le {formatDate(ban.banned_at)}</span>
          <span>par {ban.banned_by}</span>
          {ban.expires_at && !expired && (
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3 h-3" /> Expire le {formatDate(ban.expires_at)}
            </span>
          )}
        </div>
      </div>
      {!expired && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLift(ban.id)}
          disabled={lifting}
          className="flex-shrink-0 text-text-muted hover:text-green-400 hover:bg-green-500/10 gap-1.5"
        >
          {lifting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
          Lever
        </Button>
      )}
    </div>
  );
}

export default function BansPage() {
  const configured = isSupabaseConfigured();
  const [bans, setBans] = useState<DbContestBan[]>([]);
  const [loading, setLoading] = useState(configured);
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [envId, setEnvId] = useState<string>('');

  const load = useCallback(async (eid: string, all: boolean) => {
    setLoading(true);
    const data = all ? await getAllBans(eid) : await getActiveBans(eid);
    setBans(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    getEnvironments().then(envs => {
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) { setEnvId(active.id); load(active.id, showAll); }
      else setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  useEffect(() => {
    if (envId) load(envId, showAll);
  }, [showAll, envId, load]);

  async function handleLift(banId: string) {
    setLiftingId(banId);
    try {
      await liftBan(banId);
      toast.success("Ban levé");
      if (envId) await load(envId, showAll);
    } catch {
      toast.error("Erreur lors de la levée du ban");
    } finally {
      setLiftingId(null);
    }
  }

  const activeBans = bans.filter(b => !isExpired(b));
  const expiredBans = bans.filter(b => isExpired(b));

  return (
    <AdminLayout title="Bans">
      <div className="max-w-3xl space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted">
              Membres bannis du concours (bot) — les membres bannis ne peuvent pas soumettre de participation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => envId && load(envId, showAll)}
              disabled={loading}
              className="gap-1.5 text-text-muted"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </Button>
          </div>
        </motion.div>

        {/* Active bans */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest flex items-center gap-2">
                <ShieldOff className="w-3.5 h-3.5" />
                Bans actifs ({loading ? '…' : activeBans.length})
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : activeBans.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">Aucun membre banni actuellement</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeBans.map(ban => (
                  <BanRow
                    key={ban.id}
                    ban={ban}
                    onLift={handleLift}
                    lifting={liftingId === ban.id}
                  />
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Expired / history */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3 h-3" />
            {showAll ? "Masquer l'historique" : "Afficher l'historique des bans expirés"}
            {showAll && expiredBans.length > 0 && ` (${expiredBans.length})`}
          </button>

          {showAll && expiredBans.length > 0 && (
            <Card className="glass p-6 space-y-3 mt-3">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Bans expirés</h2>
              <div className="space-y-2">
                {expiredBans.map(ban => (
                  <BanRow
                    key={ban.id}
                    ban={ban}
                    onLift={handleLift}
                    lifting={liftingId === ban.id}
                  />
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
