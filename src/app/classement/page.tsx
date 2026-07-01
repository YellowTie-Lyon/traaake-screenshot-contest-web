"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Award, TrendingUp, Users, Zap, Heart, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { mockMembers } from "@/data/mock";
import {
  getSeasonLeaderboard,
  getActiveContestLeaderboard,
  getSeasons,
  getActiveContestPublic,
  getActiveEnvironment,
  getSeasonStats,
  type LeaderboardEntry,
  type CurrentContestEntry,
  type Season,
} from "@/features/public/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { supabase } from "@/lib/supabase/client";

const rankColors: Record<number, string> = { 1: "#f59e0b", 2: "#9ca3af", 3: "#b45309" };
const rankEmojis: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

type Tab = 'saison' | 'concours';

export default function ClassementPage() {
  const configured = isSupabaseConfigured();
  const [tab, setTab] = useState<Tab>('saison');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonEntries, setSeasonEntries] = useState<LeaderboardEntry[]>([]);
  const [contestEntries, setContestEntries] = useState<CurrentContestEntry[]>([]);
  const [activeContest, setActiveContest] = useState<{ id: string; title: string | null; status: string; started_at: string | null; ends_at: string | null } | null>(null);
  const [loading, setLoading] = useState(configured);
  const [lbLoading, setLbLoading] = useState(false);
  const [seasonStats, setSeasonStats] = useState({ activePilots: 0, totalParticipations: 0, totalVotes: 0 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const loadSeasonData = useCallback(async (seasonId: string) => {
    setLbLoading(true);
    const [lb, stats] = await Promise.all([
      getSeasonLeaderboard(seasonId),
      getSeasonStats(seasonId),
    ]);
    setSeasonEntries(lb);
    setSeasonStats(stats);
    setLbLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    const [allSeasons, env] = await Promise.all([getSeasons(), getActiveEnvironment()]);
    setSeasons(allSeasons);
    const active = allSeasons.find(s => s.is_active) ?? allSeasons[0] ?? null;
    const activeId = active?.id ?? null;
    setSelectedSeasonId(activeId);
    const [lb, contest, contestLb, stats] = await Promise.all([
      getSeasonLeaderboard(activeId ?? undefined),
      env ? getActiveContestPublic(env.id) : Promise.resolve(null),
      env ? getActiveContestLeaderboard(env.id) : Promise.resolve([]),
      activeId ? getSeasonStats(activeId) : Promise.resolve({ activePilots: 0, totalParticipations: 0, totalVotes: 0 }),
    ]);
    setSeasonEntries(lb);
    setActiveContest(contest);
    setContestEntries(contestLb);
    setSeasonStats(stats);
    setLoading(false);
  }, [configured]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload leaderboard + stats when user switches season
  useEffect(() => {
    if (selectedSeasonId && !loading) { setPage(0); loadSeasonData(selectedSeasonId); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId]);

  // Reset page on search
  useEffect(() => { setPage(0); }, [search]);

  // Realtime: refresh contest stats + leaderboard on any relevant change
  useEffect(() => {
    if (!activeContest?.id || !supabase) return;

    const refreshLeaderboard = () => {
      const env = getActiveEnvironment();
      if (env) getActiveContestLeaderboard(env.id).then(setContestEntries);
    };

    const channel = supabase
      .channel(`contest-live-${activeContest.id}`)
      // Contest row update (total_participations, total_votes, status)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'contests',
        filter: `id=eq.${activeContest.id}`,
      }, payload => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = payload.new as any;
        setActiveContest(prev => prev ? {
          ...prev,
          status: updated.status ?? prev.status,
        } : null);
        refreshLeaderboard();
      })
      // Participation vote_count update → re-sort leaderboard
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'participations',
        filter: `contest_id=eq.${activeContest.id}`,
      }, () => { refreshLeaderboard(); })
      // New participation added
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'participations',
        filter: `contest_id=eq.${activeContest.id}`,
      }, () => { refreshLeaderboard(); })
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [activeContest?.id]);

  const mockEntries: LeaderboardEntry[] = mockMembers.map(m => ({
    rank: m.rank, discord_user_id: m.id, discord_username: m.username,
    discord_display_name: m.username, avatar_url: m.avatar,
    total_points: m.points, participations: m.participations, wins: m.wins,
  }));

  const seasonData = configured && !loading ? seasonEntries : mockEntries;
  const hasActiveContest = !!activeContest;

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const query = normalize(search.trim());

  const filteredSeason = query
    ? seasonData.filter(m => normalize(m.discord_display_name ?? m.discord_username ?? "").includes(query))
    : seasonData;
  const filteredContest = query
    ? contestEntries.filter(e => normalize(e.discord_display_name ?? e.discord_username ?? "").includes(query))
    : contestEntries;

  const top3 = filteredSeason.slice(0, 3);
  // When searching show all results; otherwise paginate
  const pagedSeason = query ? filteredSeason : filteredSeason.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = query ? 1 : Math.ceil(filteredSeason.length / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-xs font-medium mb-4">
            <Zap className="h-3 w-3" />{seasons.find(s => s.id === selectedSeasonId)?.name ?? "Saison 2026"}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
            Classement{" "}
            <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">Général</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Classement cumulatif des pilotes les plus actifs du concours screenshot hebdomadaire MSFS.
          </p>
        </motion.div>

        {/* Stats — changent selon le tab actif */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-3 gap-4 mb-8">
          {(tab === 'concours' && activeContest
            ? [
                { label: "Participants", value: contestEntries.length, icon: Users, accent: true },
                { label: "Votes — screenshot leader", value: contestEntries[0]?.vote_count ?? 0, icon: Heart, accent: true },
                { label: "Votes totaux concours", value: contestEntries.reduce((s, e) => s + e.vote_count, 0), icon: Star, accent: true },
              ]
            : [
                { label: "Pilotes actifs", value: seasonStats.activePilots, icon: Users, accent: false },
                { label: "Participations", value: seasonStats.totalParticipations, icon: TrendingUp, accent: false },
                { label: "Votes totaux", value: seasonStats.totalVotes, icon: Star, accent: false },
              ]
          ).map(stat => (
            <Card key={stat.label} className={`glass text-center py-4 px-3 transition-all duration-300 ${stat.accent ? 'border-green-700/30' : ''}`}>
              <div className="flex flex-col items-center gap-1">
                <stat.icon className={`h-4 w-4 mb-1 ${stat.accent ? 'text-green-400' : 'text-cyan'}`} />
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Points system */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { emoji: "🥇", label: "1ère place", pts: "+100 pts", color: "#f59e0b" },
            { emoji: "🥈", label: "2ème place", pts: "+60 pts",  color: "#9ca3af" },
            { emoji: "🥉", label: "3ème place", pts: "+30 pts",  color: "#b45309" },
            { emoji: "📸", label: "Participation", pts: "+20 pts", color: "#22d3ee" },
          ].map(({ emoji, label, pts, color }) => (
            <div key={label} className="glass flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: `${color}30` }}>
              <span className="text-xl">{emoji}</span>
              <div>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-bold" style={{ color }}>{pts}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:items-center sm:flex-wrap">
          {/* Season selector pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
            {(configured && seasons.length > 0 ? seasons : [{ id: 'mock', name: 'Année 2026', is_active: true, started_at: null, ended_at: null }]).map(s => (
              <button
                key={s.id}
                onClick={() => { setTab('saison'); setSelectedSeasonId(s.id); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  tab === 'saison' && selectedSeasonId === s.id
                    ? 'bg-cyan/10 border-cyan/30 text-cyan'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                🏆 {s.name}
                {s.is_active && <span className="ml-1.5 text-[10px] text-cyan font-semibold uppercase tracking-wide">en cours</span>}
              </button>
            ))}
          </div>

          {/* Separator */}
          {hasActiveContest && <span className="w-px h-6 bg-border hidden sm:block" />}

          {/* Live contest tab */}
          {hasActiveContest && activeContest && (
            <button onClick={() => setTab('concours')} className="relative group">
              <span className={`absolute inset-0 rounded-lg ${tab === 'concours' ? 'animate-pulse bg-green-500/10' : 'bg-green-500/0 group-hover:bg-green-500/5'} transition-all`} />
              <span className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                tab === 'concours'
                  ? 'bg-green-900/30 border-green-500/40 text-green-300 shadow-[0_0_12px_rgba(74,222,128,0.15)]'
                  : 'border-green-700/30 text-green-400/70 hover:text-green-300 hover:border-green-500/40'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                📸 Concours du{' '}
                {activeContest.started_at ? new Date(activeContest.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {' '}au{' '}
                {activeContest.ends_at ? new Date(activeContest.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {activeContest.status === 'tiebreak' && <span className="text-xs text-amber-400 font-bold">⚡ Égalité</span>}
              </span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : lbLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : tab === 'concours' && hasActiveContest ? (
          /* Live contest leaderboard */
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card className="glass overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">Classement du concours</h2>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Temps réel
                </span>
              </div>
              <div className="divide-y divide-border">
                {filteredContest.length === 0 ? (
                  <p className="text-center py-12 text-sm text-text-muted">{query ? "Aucun résultat." : "Aucune participation pour l'instant."}</p>
                ) : filteredContest.map((entry, idx) => {
                  const name = entry.discord_display_name ?? entry.discord_username ?? '?';
                  return (
                    <motion.div key={entry.participation_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-surface-2/50 transition-colors">
                      <div className="w-8 text-center flex-shrink-0">
                        {entry.rank <= 3 ? <span className="text-lg">{rankEmojis[entry.rank]}</span> : <span className="text-sm text-text-muted">#{entry.rank}</span>}
                      </div>
                      {entry.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                          <Image src={entry.image_url} alt="screenshot" width={48} height={48} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 border border-border bg-surface-2" />
                      )}
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={entry.avatar_url ?? undefined} alt={name} />
                        <AvatarFallback>{name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-text-primary flex-1 truncate">{name}</span>
                      <div className="flex items-center gap-1 text-cyan font-bold flex-shrink-0">
                        <Heart className="w-3.5 h-3.5" />{entry.vote_count}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ) : (
          /* Season leaderboard */
          <>
            {/* Podium — masqué pendant une recherche */}
            {!query && <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="mb-12">
              <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-cyan" /> Podium
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[top3[1], top3[0], top3[2]].map((member, displayIdx) => {
                  const podiumOrder = [2, 1, 3];
                  const rank = podiumOrder[displayIdx];
                  if (!member) return null;
                  const name = member.discord_display_name ?? member.discord_username ?? member.discord_user_id.slice(0, 8);
                  return (
                    <motion.div key={member.discord_user_id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + displayIdx * 0.1 }} className={displayIdx === 1 ? "sm:-mt-4" : ""}>
                      <Card className="glass text-center p-6 relative overflow-hidden" style={{ borderColor: `${rankColors[rank]}40` }}>
                        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top, ${rankColors[rank]}, transparent)` }} />
                        <div className="relative">
                          <div className="text-3xl mb-3">{rankEmojis[rank]}</div>
                          <Avatar className="h-16 w-16 mx-auto border-2 mb-3" style={{ borderColor: rankColors[rank] }}>
                            <AvatarImage src={member.avatar_url ?? undefined} alt={name} />
                            <AvatarFallback>{name[0]}</AvatarFallback>
                          </Avatar>
                          <h3 className="font-bold text-text-primary text-lg">{name}</h3>
                          <p className="text-2xl font-bold mt-1" style={{ color: rankColors[rank] }}>{member.total_points.toLocaleString()}</p>
                          <p className="text-xs text-text-muted mt-1">points</p>
                          <div className="flex justify-center gap-3 mt-4 text-xs text-text-secondary">
                            <span>{member.wins} victoire{member.wins > 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>{member.participations} part.</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>}

            {/* Full table */}
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.4 }}>
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                  <Award className="h-5 w-5 text-cyan" /> Classement complet
                  <span className="text-sm font-normal text-text-muted">({seasonData.length} membre{seasonData.length !== 1 ? 's' : ''})</span>
                </h2>
                <div className="flex flex-col items-end gap-1">
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher un pseudo…"
                      className="w-full pl-9 pr-9 py-2 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-colors"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {query && (
                    <p className="text-xs text-text-muted">
                      {filteredSeason.length} résultat{filteredSeason.length !== 1 ? "s" : ""} pour «&nbsp;{search.trim()}&nbsp;»
                    </p>
                  )}
                </div>
              </div>
              <Card className="glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Rang</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Pilote</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Points</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider hidden sm:table-cell">Part.</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">Victoires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedSeason.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-text-muted">{query ? "Aucun résultat." : "Aucun participant pour cette saison."}</td></tr>
                      ) : pagedSeason.map((member, idx) => {
                        const name = member.discord_display_name ?? member.discord_username ?? member.discord_user_id.slice(0, 8);
                        const isMatch = query && normalize(name).includes(query);
                        return (
                          <motion.tr key={member.discord_user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className={`transition-colors ${isMatch ? "bg-cyan/5 border-l-2 border-l-cyan" : "hover:bg-surface-2/50"}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {member.rank <= 3 ? <span className="text-lg">{rankEmojis[member.rank]}</span> : <span className="text-sm font-medium text-text-muted">#{member.rank}</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatar_url ?? undefined} alt={name} />
                                  <AvatarFallback>{name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-text-primary">{name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="font-bold" style={{ color: member.rank <= 3 ? rankColors[member.rank] : "#f0f4f8" }}>{member.total_points.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-text-secondary hidden sm:table-cell">{member.participations}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right hidden md:table-cell">
                              {member.wins > 0 ? <Badge variant="cyan">{member.wins}</Badge> : <span className="text-text-muted">—</span>}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <p className="text-xs text-text-muted">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredSeason.length)} sur {filteredSeason.length} membres
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                      </button>
                      <span className="text-xs text-text-muted px-1">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Suivant <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
