"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, History, Tag } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getEnvironments } from "@/features/environments/api";
import { supabase } from "@/lib/supabase/client";

interface ContestRow {
  id: string;
  title: string | null;
  theme: string | null;
  status: string;
  started_at: string | null;
  closed_at: string | null;
  participationCount: number;
  voteCount: number;
  winner_name: string | null;
  winner_avatar: string | null;
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start) return '—';
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return `Depuis le ${fmt(start)}`;
  return `Du ${fmt(start)} au ${fmt(end)}`;
}

export default function HistoriquePage() {
  const [contests, setContests] = useState<ContestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [envId, setEnvId] = useState<string>('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    getEnvironments().then(envs => {
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) setEnvId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!supabase || !envId) return;
    setLoading(true);

    supabase
      .from('contests')
      .select('id, title, theme, status, started_at, closed_at, winner_participation_id')
      .eq('environment_id', envId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .then(async ({ data: contestData }) => {
        if (!contestData?.length) { setContests([]); setLoading(false); return; }

        // Resolve participation counts and winner names in parallel
        const [partsRes, winnerPartIds] = [
          await Promise.all(
            contestData.map(c =>
              supabase!
                .from('participations')
                .select('vote_count', { count: 'exact' })
                .eq('contest_id', c.id)
                .then(({ data, count }) => ({
                  contestId: c.id,
                  participationCount: count ?? 0,
                  voteCount: (data ?? []).reduce((s, r) => s + (r.vote_count ?? 0), 0),
                }))
            )
          ),
          contestData.map(c => c.winner_participation_id).filter(Boolean) as string[],
        ];

        const winnerMap = new Map<string, { name: string | null; avatar: string | null }>();
        if (winnerPartIds.length > 0 && supabase) {
          const { data: parts } = await supabase
            .from('participations')
            .select('id, participant:participant_id(discord_display_name, discord_username, avatar_url)')
            .in('id', winnerPartIds);
          for (const p of parts ?? []) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const participant = Array.isArray((p as any).participant) ? (p as any).participant[0] : (p as any).participant;
            winnerMap.set(p.id, {
              name: participant?.discord_display_name ?? participant?.discord_username ?? null,
              avatar: participant?.avatar_url ?? null,
            });
          }
        }

        const statsMap = new Map(partsRes.map(r => [r.contestId, r]));

        setContests(contestData.map(c => ({
          id: c.id,
          title: c.title,
          theme: c.theme ?? null,
          status: c.status,
          started_at: c.started_at,
          closed_at: c.closed_at,
          participationCount: statsMap.get(c.id)?.participationCount ?? 0,
          voteCount: statsMap.get(c.id)?.voteCount ?? 0,
          winner_name: c.winner_participation_id ? (winnerMap.get(c.winner_participation_id)?.name ?? null) : null,
          winner_avatar: c.winner_participation_id ? (winnerMap.get(c.winner_participation_id)?.avatar ?? null) : null,
        })));
        setLoading(false);
      });
  }, [envId]);

  function exportCSV() {
    const rows = [
      ['Période', 'Titre', 'Thème', 'Gagnant', 'Participations', 'Votes'],
      ...contests.map(c => [
        formatPeriod(c.started_at, c.closed_at),
        c.title ?? '—',
        c.theme ?? '—',
        c.winner_name ?? '—',
        String(c.participationCount),
        String(c.voteCount),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historique-concours.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout title="Historique">
      <div className="max-w-5xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted flex items-center gap-2">
              <History className="w-4 h-4 text-cyan" />
              {loading ? '…' : `${contests.length} concours terminés`}
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={loading || contests.length === 0}>
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>

          <Card className="glass overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : contests.length === 0 ? (
              <div className="p-12 text-center">
                <History className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">Aucun concours terminé pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Période</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Titre / Thème</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Gagnant</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Part.</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Votes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contests.map((c, i) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-surface-2/50 transition-colors"
                      >
                        <td className="px-5 py-4 text-sm text-text-secondary whitespace-nowrap">{formatPeriod(c.started_at, c.closed_at)}</td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-text-primary">{c.title ?? '—'}</p>
                          {c.theme && (
                            <p className="text-xs text-cyan flex items-center gap-1 mt-0.5">
                              <Tag className="w-3 h-3" /> {c.theme}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {c.winner_name ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={c.winner_avatar ?? undefined} />
                                <AvatarFallback>{c.winner_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-text-primary">{c.winner_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-text-secondary">{c.participationCount}</td>
                        <td className="px-5 py-4 text-right text-sm text-text-secondary">{c.voteCount}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
