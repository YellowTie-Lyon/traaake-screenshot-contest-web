"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Play, Pause, StopCircle, Archive, Loader2, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SupabaseBanner } from "@/components/admin/SupabaseBanner";
import { EnvironmentBadge } from "@/components/admin/EnvironmentBadge";
import { getEnvironments } from "@/features/environments/api";
import { getActiveContest, updateContestStatus } from "@/features/contests/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { mockCurrentContest } from "@/data/mock";
import type { DbContest, DbEnvironment, ContestStatus, EnvironmentName } from "@/lib/supabase/types";

const statusVariants: Record<ContestStatus, "open" | "paused" | "closed" | "draft" | "archived"> = {
  open: "open", paused: "paused", closed: "closed", draft: "draft", archived: "archived",
};
const statusLabels: Record<ContestStatus, string> = {
  open: "Ouvert", paused: "Suspendu", closed: "Fermé", draft: "Brouillon", archived: "Archivé",
};

export default function ConcoursPage() {
  const configured = isSupabaseConfigured();
  const [environments, setEnvironments] = useState<DbEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [contest, setContest] = useState<DbContest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    getEnvironments().then(envs => {
      setEnvironments(envs);
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) setSelectedEnvId(active.id);
    });
  }, [configured]);

  useEffect(() => {
    if (!selectedEnvId || !configured) return;
    setLoading(true);
    getActiveContest(selectedEnvId)
      .then(c => setContest(c))
      .finally(() => setLoading(false));
  }, [selectedEnvId, configured]);

  async function handleStatusChange(newStatus: ContestStatus) {
    if (!contest || !configured) {
      toast.success(`Action mockée — Connectez Supabase en Phase 2.`);
      return;
    }
    setUpdating(true);
    try {
      await updateContestStatus(contest.id, newStatus);
      setContest(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Statut mis à jour : ${statusLabels[newStatus]}`);
    } catch {
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdating(false);
    }
  }

  const selectedEnv = environments.find(e => e.id === selectedEnvId);
  const currentStatus: ContestStatus = (contest?.status as ContestStatus) ?? mockCurrentContest.status;

  return (
    <AdminLayout title="Concours">
      <div className="max-w-3xl space-y-8">
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
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <>
            {/* Contest info */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-semibold text-text-primary">
                        {contest?.title ?? mockCurrentContest.id}
                      </h2>
                      <Badge variant={statusVariants[currentStatus]}>{statusLabels[currentStatus]}</Badge>
                      {selectedEnv && <EnvironmentBadge env={selectedEnv.name as EnvironmentName} />}
                    </div>
                    {!contest && configured && (
                      <p className="text-sm text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Aucun concours actif dans cet environnement
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Participations", value: contest?.total_participations ?? mockCurrentContest.participations },
                    { label: "Votes", value: contest?.total_votes ?? mockCurrentContest.totalVotes },
                    { label: "Début", value: contest?.started_at ? new Date(contest.started_at).toLocaleDateString('fr-FR') : mockCurrentContest.startDate },
                    { label: "Fin prévue", value: contest?.ends_at ? new Date(contest.ends_at).toLocaleDateString('fr-FR') : mockCurrentContest.endDate },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-2 rounded-xl p-4 border border-border-subtle">
                      <p className="text-xs text-text-muted mb-1">{label}</p>
                      <p className="font-semibold text-text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass p-6">
                <h3 className="font-semibold text-text-primary mb-2">Actions</h3>
                <p className="text-xs text-amber-400 mb-5 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Ces actions modifient le statut en base. Le bot Discord n&apos;est pas encore connecté (Phase 3).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="gap-2 justify-start" disabled={updating} onClick={() => handleStatusChange('open')}>
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-emerald-400" />}
                    Ouvrir le concours
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start" disabled={updating} onClick={() => handleStatusChange('paused')}>
                    <Pause className="w-4 h-4 text-amber-400" /> Suspendre
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start" disabled={updating} onClick={() => handleStatusChange('open')}>
                    <Play className="w-4 h-4 text-cyan" /> Réouvrir
                  </Button>
                  <Button variant="destructive" className="gap-2 justify-start" disabled={updating} onClick={() => handleStatusChange('closed')}>
                    <StopCircle className="w-4 h-4" /> Fermer
                  </Button>
                  <Button variant="ghost" className="gap-2 justify-start sm:col-span-2" disabled={updating} onClick={() => handleStatusChange('archived')}>
                    <Archive className="w-4 h-4" /> Archiver
                  </Button>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
