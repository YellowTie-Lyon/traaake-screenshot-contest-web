"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Users, ThumbsUp, Zap, Play, PauseCircle, XCircle, RefreshCw, Bot, Calendar, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SupabaseBanner } from "@/components/admin/SupabaseBanner";
import { getEnvironments } from "@/features/environments/api";
import { getActiveContest, updateContestStatus } from "@/features/contests/api";
import { getDashboardData, isBotOnline, sendBotCommand, type DashboardData } from "@/features/dashboard/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { supabase } from "@/lib/supabase/client";
import type { ContestStatus } from "@/lib/supabase/types";

const STATUS_LABELS: Record<string, string> = {
  active: "OUVERT", tiebreak: "ÉGALITÉ", suspended: "SUSPENDU",
  closed: "FERMÉ", archived: "ARCHIVÉ",
};
const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400", tiebreak: "text-amber-400", suspended: "text-amber-400",
  closed: "text-text-muted", archived: "text-text-muted",
};

export default function AdminDashboard() {
  const configured = isSupabaseConfigured();
  const [data, setData] = useState<DashboardData>({ contest: null, guildConfig: null, leader: null });
  const [envId, setEnvId] = useState<string>('');
  const [loading, setLoading] = useState(configured);
  const [updating, setUpdating] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  const load = useCallback(async (eid: string) => {
    setLoading(true);
    const d = await getDashboardData(eid);
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    getEnvironments().then(envs => {
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) { setEnvId(active.id); load(active.id); }
      else setLoading(false);
    });
  }, [configured, load]);

  // Realtime on active contest row
  useEffect(() => {
    if (!data.contest?.id || !supabase) return;
    const ch = supabase
      .channel(`dashboard-contest-${data.contest.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contests', filter: `id=eq.${data.contest.id}` }, () => {
        if (envId) load(envId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'discord_guild_configs', filter: `environment_id=eq.${envId}` }, () => {
        if (envId) load(envId);
      })
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [data.contest?.id, envId, load]);

  async function handleStatus(status: ContestStatus) {
    if (!data.contest) return;
    setUpdating(true);
    try {
      await updateContestStatus(data.contest.id, status);
      toast.success(`Concours — ${STATUS_LABELS[status] ?? status}`);
      if (envId) await load(envId);
    } catch { toast.error("Erreur lors de la mise à jour"); }
    finally { setUpdating(false); }
  }

  async function handleResync() {
    if (!envId) return;
    setResyncing(true);
    try {
      await sendBotCommand(envId, 'resync_votes');
      toast.success("Commande envoyée au bot — recalcul en cours…");
    } catch { toast.error("Erreur lors de l'envoi de la commande"); }
    finally { setResyncing(false); }
  }

  const { contest, guildConfig, leader } = data;
  const online = isBotOnline(guildConfig);
  const status = contest?.status ?? null;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8 max-w-5xl">
        {!configured && <SupabaseBanner />}

        {/* Stats grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <Card className="glass">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Zap className={`h-4 w-4 ${status ? STATUS_COLORS[status] : 'text-text-muted'}`} />
                    {status === 'active' && <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />}
                  </div>
                  <p className={`text-xl font-bold ${status ? STATUS_COLORS[status] : 'text-text-muted'}`}>
                    {status ? STATUS_LABELS[status] : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Statut</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-5">
                  <Calendar className="h-4 w-4 text-cyan mb-3" />
                  <p className="text-xl font-bold text-cyan">
                    {contest?.started_at
                      ? new Date(contest.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Début</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-5">
                  <Users className="h-4 w-4 text-text-primary mb-3" />
                  <p className="text-xl font-bold text-text-primary">{contest?.total_participations ?? 0}</p>
                  <p className="text-xs text-text-muted mt-1">Participations</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-5">
                  <ThumbsUp className="h-4 w-4 text-cyan mb-3" />
                  <p className="text-xl font-bold text-cyan">{contest?.total_votes ?? 0}</p>
                  <p className="text-xs text-text-muted mt-1">Votes</p>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leader */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-cyan" /> Leader actuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                  </div>
                ) : leader ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-yellow-500/50">
                      <AvatarImage src={leader.avatar_url ?? undefined} />
                      <AvatarFallback>{(leader.discord_display_name ?? leader.discord_username ?? '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-text-primary text-lg">
                        {leader.discord_display_name ?? leader.discord_username ?? 'Inconnu'}
                      </p>
                      <p className="text-sm text-text-secondary">{leader.total_points.toLocaleString()} points</p>
                      <p className="text-xs text-text-muted mt-0.5">{leader.wins} victoire{leader.wins !== 1 ? 's' : ''} · {leader.participations} part.</p>
                    </div>
                    <span className="text-3xl ml-auto">🥇</span>
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">Aucun participant pour le moment</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Bot status */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan" /> Statut du Bot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-32" /></div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                      <span className={`font-medium ${online ? 'text-green-400' : 'text-red-400'}`}>
                        {online ? 'En ligne' : 'Hors ligne'}
                      </span>
                      {guildConfig?.last_sync && (
                        <span className="text-xs text-text-muted ml-auto">
                          Sync {new Date(guildConfig.last_sync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {contest?.title && (
                      <p className="text-sm text-text-secondary">
                        Concours : <span className="text-text-primary">{contest.title}</span>
                      </p>
                    )}
                    {guildConfig?.contest_channel_name && (
                      <p className="text-sm text-text-secondary">
                        Canal : <span className="text-text-primary">#{guildConfig.contest_channel_name}</span>
                      </p>
                    )}
                    <p className="text-sm text-text-secondary">
                      Mode : <span className="text-cyan">
                        {guildConfig ? (guildConfig as unknown as { auto_mode_enabled?: boolean }).auto_mode_enabled ? 'Automatique' : 'Manuel' : '—'}
                      </span>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleStatus('suspended')}
                  disabled={updating || !contest || status !== 'active'}
                  className="gap-2"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                  Suspendre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatus('active')}
                  disabled={updating || !contest || status !== 'suspended'}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" /> Réouvrir
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatus('closed')}
                  disabled={updating || !contest || !['active', 'tiebreak', 'suspended'].includes(status ?? '')}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" /> Fermer
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleResync}
                  disabled={resyncing || !contest || !online}
                  className="gap-2"
                >
                  {resyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Recalculer les votes
                </Button>
              </div>
              {!contest && !loading && (
                <p className="text-xs text-text-muted mt-3">Aucun concours actif — ouvrez-en un depuis la page Concours.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
