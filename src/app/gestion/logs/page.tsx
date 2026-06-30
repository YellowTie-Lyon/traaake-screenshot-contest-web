"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Terminal, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLogs, type BotLog, type LogLevel, type LogAction } from "@/features/logs/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { supabase } from "@/lib/supabase/client";

const PAGE_SIZE = 50;

const LEVEL_STYLES: Record<LogLevel, { badge: string; dot: string; row: string }> = {
  info:  { badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",  dot: "bg-blue-400",   row: "" },
  warn:  { badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400", row: "bg-amber-500/5" },
  error: { badge: "bg-red-500/15 text-red-300 border-red-500/30",     dot: "bg-red-400",    row: "bg-red-500/5" },
};

const ACTION_LABELS: Record<string, string> = {
  contest_opened:                "Concours ouvert",
  contest_closed:                "Concours fermé",
  contest_no_entries:            "Fermé sans participant",
  tiebreak_started:              "Égalité détectée",
  tiebreak_resolved:             "Égalité résolue",
  contest_ban:                   "Membre banni",
  contest_unban:                 "Membre débanni",
  participation_submitted:       "Participation soumise",
  duplicate_submission_blocked:  "Doublon bloqué",
  banned_user_blocked:           "Banni a tenté de participer",
  points_adjusted:               "Points ajustés",
  participation_insert_failed:   "Erreur insertion participation",
  participant_upsert_failed:     "Erreur upsert participant",
};

const ALL_ACTIONS: LogAction[] = [
  "contest_opened", "contest_closed", "contest_no_entries",
  "tiebreak_started", "tiebreak_resolved",
  "contest_ban", "contest_unban",
  "participation_submitted", "duplicate_submission_blocked", "banned_user_blocked",
  "points_adjusted", "participation_insert_failed", "participant_upsert_failed",
];

function DetailsCell({ details }: { details: Record<string, unknown> | null }) {
  if (!details || Object.keys(details).length === 0) return <span className="text-text-muted text-xs">—</span>;

  // Try to render as key/value pairs
  const entries = Object.entries(details);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
      {entries.map(([k, v]) => (
        <span key={k} className="text-xs">
          <span className="text-text-muted">{k}: </span>
          <span className="text-text-secondary font-mono">
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </span>
      ))}
    </div>
  );
}

function LogRow({ log }: { log: BotLog }) {
  const level = (log.level ?? 'info') as LogLevel;
  const styles = LEVEL_STYLES[level] ?? LEVEL_STYLES.info;
  return (
    <tr className={`border-b border-border/40 hover:bg-surface-2/60 transition-colors ${styles.row}`}>
      <td className="px-4 py-2.5 w-4">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles.badge}`}>
          {level}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-text-muted font-mono">
        {new Date(log.created_at).toLocaleString('fr-FR', {
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-text-primary font-medium">
          {ACTION_LABELS[log.action] ?? log.action}
        </span>
        <span className="ml-2 text-[10px] text-text-muted font-mono">{log.action}</span>
      </td>
      <td className="px-3 py-2.5">
        <DetailsCell details={log.details} />
      </td>
    </tr>
  );
}

export default function LogsPage() {
  const configured = isSupabaseConfigured();
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [page, setPage] = useState(0);
  const [levelFilter, setLevelFilter] = useState<LogLevel | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const liveRef = useRef(true);

  const load = useCallback(async (p: number, level: LogLevel | null, action: string | null) => {
    setLoading(true);
    const result = await getLogs({ level, action, page: p, pageSize: PAGE_SIZE });
    setLogs(result.data);
    setCount(result.count);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    load(page, levelFilter, actionFilter);
  }, [configured, load, page, levelFilter, actionFilter]);

  // Realtime — insert new logs at top when on page 0
  useEffect(() => {
    if (!supabase || !configured) return;
    const ch = supabase
      .channel('bot-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_logs' }, (payload) => {
        if (!liveRef.current) return;
        const newLog = payload.new as BotLog;
        // Only prepend if filters match
        if (levelFilter && newLog.level !== levelFilter) return;
        if (actionFilter && newLog.action !== actionFilter) return;
        if (page === 0) {
          setLogs(prev => [newLog, ...prev.slice(0, PAGE_SIZE - 1)]);
          setCount(c => c + 1);
        }
      })
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [configured, levelFilter, actionFilter, page]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  function setFilter(level: LogLevel | null, action: string | null) {
    setLevelFilter(level);
    setActionFilter(action);
    setPage(0);
  }

  return (
    <AdminLayout title="Logs bot">
      <div className="space-y-4 max-w-6xl">

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 flex-wrap">
          {/* Level filters */}
          <div className="flex items-center gap-1.5">
            {(['info', 'warn', 'error'] as LogLevel[]).map(lvl => {
              const s = LEVEL_STYLES[lvl];
              const active = levelFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setFilter(active ? null : lvl, actionFilter)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    active ? s.badge : 'border-border-subtle text-text-muted hover:border-border hover:text-text-secondary'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {lvl.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Action filter select */}
          <div className="relative">
            <select
              value={actionFilter ?? ''}
              onChange={e => setFilter(levelFilter, e.target.value || null)}
              className="h-7 pl-2.5 pr-7 rounded-lg border border-border-subtle bg-surface text-xs text-text-secondary focus:outline-none focus:border-cyan/50 appearance-none cursor-pointer"
            >
              <option value="">Toutes les actions</option>
              {ALL_ACTIONS.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {(levelFilter || actionFilter) && (
            <button
              onClick={() => setFilter(null, null)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <X className="w-3 h-3" /> Effacer les filtres
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {loading ? '…' : `${count.toLocaleString()} entrée${count !== 1 ? 's' : ''}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => load(page, levelFilter, actionFilter)}
              disabled={loading}
              className="gap-1.5 text-text-muted h-7 px-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {/* Live indicator */}
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Temps réel
            </span>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 rounded" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <Terminal className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">Aucun log{levelFilter || actionFilter ? ' pour ces filtres' : ''}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-4" />
                      <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest">Niveau</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest whitespace-nowrap">Date</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest">Action</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => <LogRow key={log.id} log={log} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-text-muted">
                  Page {page + 1} / {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0 || loading}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1 || loading}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
