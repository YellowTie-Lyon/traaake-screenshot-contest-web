"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Play, Pause, StopCircle, Archive, Loader2, Plus, Trophy, Image as ImageIcon, Heart, Clock } from "lucide-react";
import Image from "next/image";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { SupabaseBanner } from "@/components/admin/SupabaseBanner";
import { EnvironmentBadge } from "@/components/admin/EnvironmentBadge";
import { getEnvironments } from "@/features/environments/api";
import { getActiveContest, updateContestStatus, openContest, getContestParticipations, type Participation } from "@/features/contests/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { supabase } from "@/lib/supabase/client";
import type { DbContest, DbEnvironment, ContestStatus, EnvironmentName } from "@/lib/supabase/types";

const STATUS_VARIANTS: Record<ContestStatus, "open" | "paused" | "closed" | "draft" | "archived"> = {
  active: "open",
  tiebreak: "paused",
  suspended: "paused",
  closed: "closed",
  archived: "archived",
};
const STATUS_LABELS: Record<ContestStatus, string> = {
  active: "Ouvert",
  tiebreak: "Égalité",
  suspended: "Suspendu",
  closed: "Fermé",
  archived: "Archivé",
};

function ParticipationCard({ p, rank }: { p: Participation; rank: number }) {
  const name = p.participant?.discord_display_name ?? p.participant?.discord_username ?? "Inconnu";
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border-subtle">
      <div className="flex-shrink-0 w-6 text-center text-xs text-text-muted font-mono pt-1">{medal ?? `#${rank}`}</div>
      {p.image_url ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border">
          <Image src={p.image_url} alt="screenshot" width={64} height={64} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 border border-border bg-surface flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-text-muted" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />{new Date(p.submitted_at).toLocaleString("fr-FR")}
        </p>
      </div>
      <div className="flex items-center gap-1 text-sm font-semibold text-cyan flex-shrink-0">
        <Heart className="w-3.5 h-3.5" />{p.vote_count}
      </div>
    </div>
  );
}

export default function ConcoursPage() {
  const configured = isSupabaseConfigured();
  const [environments, setEnvironments] = useState<DbEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [contest, setContest] = useState<DbContest | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showOpenForm, setShowOpenForm] = useState(false);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    getEnvironments().then(envs => {
      setEnvironments(envs);
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) setSelectedEnvId(active.id);
    });
  }, [configured]);

  const loadContest = useCallback(async () => {
    if (!selectedEnvId || !configured) return;
    setLoading(true);
    const c = await getActiveContest(selectedEnvId);
    setContest(c);
    if (c) {
      const parts = await getContestParticipations(c.id);
      setParticipations(parts);
    } else {
      setParticipations([]);
    }
    setLoading(false);
  }, [selectedEnvId, configured]);

  useEffect(() => { loadContest(); }, [loadContest]);

  // Realtime on participations
  useEffect(() => {
    if (!contest?.id || !supabase) return;
    const channel = supabase
      .channel(`participations-${contest.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations', filter: `contest_id=eq.${contest.id}` }, () => {
        getContestParticipations(contest.id).then(setParticipations);
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [contest?.id]);

  async function handleStatusChange(newStatus: ContestStatus) {
    if (!contest) return;
    setUpdating(true);
    try {
      await updateContestStatus(contest.id, newStatus);
      setContest(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Concours — ${STATUS_LABELS[newStatus]}`);
      if (newStatus === 'closed' || newStatus === 'archived') {
        setContest(null);
        setParticipations([]);
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  }

  async function handleOpen() {
    if (!selectedEnvId || !newTitle.trim()) return;
    setOpening(true);
    try {
      const c = await openContest(selectedEnvId, newTitle.trim());
      setContest(c);
      setParticipations([]);
      setShowOpenForm(false);
      setNewTitle('');
      toast.success("Concours ouvert — le bot le détectera via Realtime");
    } catch {
      toast.error("Erreur lors de l'ouverture");
    } finally {
      setOpening(false);
    }
  }

  const selectedEnv = environments.find(e => e.id === selectedEnvId);
  const status = contest?.status as ContestStatus | undefined;

  return (
    <AdminLayout title="Concours">
      <div className="max-w-4xl space-y-6">
        {!configured && <SupabaseBanner />}

        {/* Env selector */}
        {configured && environments.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">Environnement :</span>
            {environments.map(env => (
              <button key={env.id} onClick={() => setSelectedEnvId(env.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedEnvId === env.id ? 'bg-cyan/10 border-cyan/30 text-cyan' : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}>
                <EnvironmentBadge env={env.name as EnvironmentName} />
                {env.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {/* No active contest → open form */}
            {!contest && configured && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass p-8 text-center space-y-4">
                  <Trophy className="w-10 h-10 text-text-muted mx-auto" />
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">Aucun concours actif</h3>
                    <p className="text-sm text-text-muted">Ouvrez un concours — le bot détectera l'insertion via Realtime et annoncera l'ouverture sur Discord.</p>
                  </div>
                  {!showOpenForm ? (
                    <Button onClick={() => setShowOpenForm(true)} className="gap-2">
                      <Plus className="w-4 h-4" /> Ouvrir un concours
                    </Button>
                  ) : (
                    <div className="flex gap-2 max-w-sm mx-auto">
                      <Input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Ex : Concours Semaine 26 · Golden Hour"
                        onKeyDown={e => e.key === 'Enter' && handleOpen()}
                        autoFocus
                      />
                      <Button onClick={handleOpen} disabled={opening || !newTitle.trim()} className="gap-1.5 flex-shrink-0">
                        {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Ouvrir
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Active contest */}
            {contest && (
              <>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="glass p-6">
                    <div className="flex items-start gap-3 mb-5 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <h2 className="text-lg font-semibold text-text-primary">{contest.title ?? "Concours sans titre"}</h2>
                          {status && <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>}
                          {selectedEnv && <EnvironmentBadge env={selectedEnv.name as EnvironmentName} />}
                        </div>
                        <div className="flex gap-4 text-xs text-text-muted flex-wrap">
                          {contest.started_at && <span>Ouvert le {new Date(contest.started_at).toLocaleString("fr-FR")}</span>}
                          {contest.ends_at && <span>· Fermeture prévue le {new Date(contest.ends_at).toLocaleString("fr-FR")}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: "Participations", value: contest.total_participations },
                        { label: "Votes", value: contest.total_votes },
                        { label: "Chargées", value: participations.length },
                        { label: "Top votes", value: participations[0]?.vote_count ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-surface-2 rounded-xl p-3 border border-border-subtle text-center">
                          <p className="text-2xl font-bold text-text-primary">{value}</p>
                          <p className="text-xs text-text-muted">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions par statut */}
                    <div className="space-y-3">
                      {status === 'active' && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => handleStatusChange('suspended')} disabled={updating} className="gap-2">
                            <Pause className="w-4 h-4 text-amber-400" /> Suspendre
                          </Button>
                          <Button variant="destructive" onClick={() => handleStatusChange('closed')} disabled={updating} className="gap-2">
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                            Fermer le concours
                          </Button>
                        </div>
                      )}
                      {status === 'suspended' && (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => handleStatusChange('active')} disabled={updating} className="gap-2">
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Réouvrir
                          </Button>
                          <Button variant="destructive" onClick={() => handleStatusChange('closed')} disabled={updating} className="gap-2">
                            <StopCircle className="w-4 h-4" /> Fermer
                          </Button>
                        </div>
                      )}
                      {status === 'tiebreak' && (
                        <div className="space-y-2">
                          <p className="text-xs text-amber-400 flex items-center gap-1.5">
                            <Pause className="w-3.5 h-3.5" /> Égalité détectée — prolongation automatique jusqu'au départage
                          </p>
                          <Button variant="destructive" onClick={() => handleStatusChange('closed')} disabled={updating} className="gap-2">
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                            Forcer la clôture
                          </Button>
                        </div>
                      )}
                      {status === 'closed' && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <p className="text-xs text-text-muted flex-1">Concours fermé — le bot a annoncé le gagnant.</p>
                          <Button variant="ghost" onClick={() => handleStatusChange('archived')} disabled={updating} className="gap-2">
                            <Archive className="w-4 h-4" /> Archiver
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>

                {/* Participations */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="glass p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-cyan uppercase tracking-widest">
                        Participations ({participations.length})
                      </h3>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Temps réel
                      </span>
                    </div>
                    {participations.length === 0 ? (
                      <div className="text-center py-8">
                        <ImageIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                        <p className="text-sm text-text-muted">Aucune participation pour l'instant</p>
                        <p className="text-xs text-text-muted mt-1">Les screenshots postés sur Discord apparaîtront ici automatiquement</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {participations.map((p, i) => <ParticipationCard key={p.id} p={p} rank={i + 1} />)}
                      </div>
                    )}
                  </Card>
                </motion.div>
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
