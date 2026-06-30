"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Users, ThumbsUp, Zap, XCircle, Calendar, Loader2, Heart, Tag,
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
import { updateContestStatus } from "@/features/contests/api";
import { getDashboardData, type DashboardData } from "@/features/dashboard/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { supabase } from "@/lib/supabase/client";
import type { ContestStatus } from "@/lib/supabase/types";

const STATUS_LABELS: Record<string, string> = {
  active: "OUVERT", tiebreak: "ÉGALITÉ", closed: "FERMÉ",
};
const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400", tiebreak: "text-amber-400", closed: "text-text-muted",
};

export default function AdminDashboard() {
  const configured = isSupabaseConfigured();
  const [data, setData] = useState<DashboardData>({ contest: null, leader: null });
  const [envId, setEnvId] = useState<string>('');
  const [loading, setLoading] = useState(configured);
  const [updating, setUpdating] = useState(false);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations', filter: `contest_id=eq.${data.contest.id}` }, () => {
        if (envId) load(envId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contests', filter: `id=eq.${data.contest!.id}` }, () => {
        if (envId) load(envId);
      })
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [data.contest?.id, envId, load]);

  async function handleClose() {
    if (!data.contest) return;
    if (!confirm("Fermer le concours actuel ?")) return;
    setUpdating(true);
    try {
      await updateContestStatus(data.contest.id, 'closed' as ContestStatus);
      toast.success("Concours fermé");
      if (envId) await load(envId);
    } catch { toast.error("Erreur lors de la fermeture"); }
    finally { setUpdating(false); }
  }

  const { contest, leader } = data;
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
                    <Zap className={`h-4 w-4 ${status ? STATUS_COLORS[status] ?? 'text-text-muted' : 'text-text-muted'}`} />
                    {status === 'active' && <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />}
                    {status === 'tiebreak' && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
                  </div>
                  <p className={`text-xl font-bold ${status ? STATUS_COLORS[status] ?? 'text-text-muted' : 'text-text-muted'}`}>
                    {status ? (STATUS_LABELS[status] ?? status.toUpperCase()) : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Statut concours</p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardContent className="p-5">
                  <Calendar className="h-4 w-4 text-cyan mb-3" />
                  <p className="text-xl font-bold text-cyan">
                    {contest?.started_at
                      ? new Date(contest.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                      : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Ouverture</p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardContent className="p-5">
                  <Users className="h-4 w-4 text-text-primary mb-3" />
                  <p className="text-xl font-bold text-text-primary">{contest?.participationCount ?? 0}</p>
                  <p className="text-xs text-text-muted mt-1">Participations</p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardContent className="p-5">
                  <ThumbsUp className="h-4 w-4 text-cyan mb-3" />
                  <p className="text-xl font-bold text-cyan">{contest?.voteCount ?? 0}</p>
                  <p className="text-xs text-text-muted mt-1">Votes totaux</p>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active contest details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-cyan" /> Concours actif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                ) : contest ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-text-primary">{contest.title ?? "Sans titre"}</p>
                      <Badge variant={status === 'active' ? 'open' : status === 'tiebreak' ? 'paused' : 'closed'}>
                        {STATUS_LABELS[status ?? ''] ?? status}
                      </Badge>
                    </div>
                    {contest.theme && (
                      <p className="text-sm text-text-secondary flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-cyan" /> {contest.theme}
                      </p>
                    )}
                    {contest.ends_at && (
                      <p className="text-xs text-text-muted flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Fermeture le {new Date(contest.ends_at).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {contest.participationCount} participants
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" /> {contest.voteCount} votes
                      </span>
                    </div>
                    {['active', 'tiebreak'].includes(status ?? '') && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleClose}
                        disabled={updating}
                        className="gap-2 mt-2"
                      >
                        {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Fermer le concours
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-text-muted text-sm">Aucun concours actif — ouvrez-en un depuis la page Concours.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Leader */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-cyan" /> Leader de la saison
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
                      <p className="text-sm text-text-secondary">{leader.total_points.toLocaleString()} pts</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {leader.wins} victoire{leader.wins !== 1 ? 's' : ''} · {leader.participations} participations
                      </p>
                    </div>
                    <span className="text-3xl ml-auto">🥇</span>
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">Aucun participant pour le moment</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
