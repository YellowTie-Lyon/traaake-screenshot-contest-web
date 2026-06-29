"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, History, Bot, AlertTriangle, Info, ChevronDown } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";

interface ContestRow {
  id: string;
  title: string | null;
  status: string;
  started_at: string | null;
  closed_at: string | null;
  total_participations: number;
  total_votes: number;
  winner_name: string | null;
  winner_avatar: string | null;
}

interface BotLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const LOG_ICONS = {
  info: <Info className="w-3.5 h-3.5 text-cyan flex-shrink-0" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
  error: <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />,
};
const LOG_COLORS = {
  info: 'text-text-secondary',
  warn: 'text-amber-300',
  error: 'text-red-300',
};

function formatPeriod(start: string | null, end: string | null) {
  if (!start) return '—';
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return `Depuis le ${fmt(start)}`;
  return `Du ${fmt(start)} au ${fmt(end)}`;
}

export default function HistoriquePage() {
  const [tab, setTab] = useState<'contests' | 'logs'>('contests');
  const [contests, setContests] = useState<ContestRow[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [loadingContests, setLoadingContests] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(0);
  const LOG_PAGE_SIZE = 50;

  useEffect(() => {
    if (!supabase) { setLoadingContests(false); return; }
    setLoadingContests(true);
    supabase
      .from('contests')
      .select('id, title, status, started_at, closed_at, total_participations, total_votes, winner_participation_id')
      .in('status', ['closed', 'archived'])
      .order('closed_at', { ascending: false })
      .then(async ({ data: contestData }) => {
        if (!contestData?.length) { setContests([]); setLoadingContests(false); return; }

        // Resolve winner names
        const winnerPartIds = contestData.map(c => c.winner_participation_id).filter(Boolean);
        let winnerMap = new Map<string, { name: string | null; avatar: string | null }>();
        if (winnerPartIds.length > 0 && supabase) {
          const { data: parts } = await supabase
            .from('participations')
            .select('id, participant_id, participants(discord_display_name, discord_username, avatar_url)')
            .in('id', winnerPartIds);
          for (const p of parts ?? []) {
            const participant = Array.isArray(p.participants) ? p.participants[0] : p.participants;
            winnerMap.set(p.id, {
              name: participant?.discord_display_name ?? participant?.discord_username ?? null,
              avatar: participant?.avatar_url ?? null,
            });
          }
        }

        setContests(contestData.map(c => ({
          id: c.id,
          title: c.title,
          status: c.status,
          started_at: c.started_at,
          closed_at: c.closed_at,
          total_participations: c.total_participations ?? 0,
          total_votes: c.total_votes ?? 0,
          winner_name: c.winner_participation_id ? (winnerMap.get(c.winner_participation_id)?.name ?? null) : null,
          winner_avatar: c.winner_participation_id ? (winnerMap.get(c.winner_participation_id)?.avatar ?? null) : null,
        })));
        setLoadingContests(false);
      });
  }, []);

  useEffect(() => {
    if (tab !== 'logs' || !supabase) return;
    setLoadingLogs(true);
    supabase
      .from('bot_logs')
      .select('id, level, message, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(logPage * LOG_PAGE_SIZE, (logPage + 1) * LOG_PAGE_SIZE - 1)
      .then(({ data }) => {
        setLogs(prev => logPage === 0 ? (data ?? []) : [...prev, ...(data ?? [])]);
        setLoadingLogs(false);
      });
  }, [tab, logPage]);

  function exportCSV() {
    const rows = [
      ['Période', 'Gagnant', 'Participations', 'Votes', 'Statut'],
      ...contests.map(c => [
        formatPeriod(c.started_at, c.closed_at),
        c.winner_name ?? '—',
        String(c.total_participations),
        String(c.total_votes),
        c.status,
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

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {[
            { key: 'contests' as const, label: 'Concours', icon: History },
            { key: 'logs' as const, label: 'Logs du bot', icon: Bot },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-cyan text-cyan'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Contests tab */}
        {tab === 'contests' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted flex items-center gap-2">
                <History className="w-4 h-4 text-cyan" />
                {loadingContests ? '…' : `${contests.length} concours archivés`}
              </p>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={loadingContests || contests.length === 0}>
                <Download className="w-4 h-4" />
                Exporter CSV
              </Button>
            </div>

            <Card className="glass overflow-hidden">
              {loadingContests ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : contests.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-sm text-text-muted">Aucun concours archivé pour le moment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Période</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Gagnant</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Part.</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Votes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Statut</th>
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
                          <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatPeriod(c.started_at, c.closed_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4 text-right text-sm text-text-secondary">{c.total_participations}</td>
                          <td className="px-6 py-4 text-right text-sm text-text-secondary">{c.total_votes}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                              c.status === 'archived'
                                ? 'text-text-muted bg-surface-2 border-border'
                                : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                            }`}>
                              {c.status === 'archived' ? 'Archivé' : 'Fermé'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Logs tab */}
        {tab === 'logs' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {loadingLogs && logPage === 0 ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : logs.length === 0 ? (
              <Card className="glass p-12 text-center">
                <Bot className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">Aucun log disponible.</p>
              </Card>
            ) : (
              <>
                <Card className="glass divide-y divide-border overflow-hidden">
                  {logs.map(log => (
                    <div key={log.id} className="px-4 py-2.5">
                      <div
                        className="flex items-start gap-2.5 cursor-pointer"
                        onClick={() => log.metadata ? setExpandedLog(expandedLog === log.id ? null : log.id) : undefined}
                      >
                        {LOG_ICONS[log.level]}
                        <span className={`flex-1 text-xs font-mono ${LOG_COLORS[log.level]}`}>{log.message}</span>
                        <span className="text-[10px] text-text-muted flex-shrink-0">
                          {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {log.metadata && (
                          <ChevronDown className={`w-3.5 h-3.5 text-text-muted flex-shrink-0 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      {expandedLog === log.id && log.metadata && (
                        <pre className="mt-2 ml-6 text-[10px] text-text-muted bg-surface rounded p-2 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </Card>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogPage(p => p + 1)}
                    disabled={loadingLogs}
                    className="gap-2"
                  >
                    {loadingLogs ? 'Chargement...' : 'Charger plus'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
