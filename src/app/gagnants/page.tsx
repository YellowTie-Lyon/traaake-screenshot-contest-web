"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ThumbsUp, Crown, Trophy, Search, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getWinnersBySeason,
  getSeasons,
  getActiveEnvironment,
  type WinnerEntry,
  type Season,
} from "@/features/public/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

type WinnerWithSeason = WinnerEntry & { season_name: string };

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return '';
  if (!start) return formatDate(end);
  if (!end) return `Depuis le ${formatDate(start)}`;
  return `Du ${formatDate(start)} au ${formatDate(end)}`;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function GagnantsPage() {
  const configured = isSupabaseConfigured();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [envId, setEnvId] = useState<string | null>(null);
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [allWinners, setAllWinners] = useState<WinnerWithSeason[]>([]);
  const [loading, setLoading] = useState(configured);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadWinners = useCallback(async (eid: string, sid: string) => {
    setSeasonLoading(true);
    const data = await getWinnersBySeason(eid, sid);
    setWinners(data);
    setSeasonLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    Promise.all([getSeasons(), getActiveEnvironment()]).then(async ([allSeasons, env]) => {
      setSeasons(allSeasons);
      if (!env) { setLoading(false); return; }
      setEnvId(env.id);

      // Load all seasons' winners in parallel for global search
      const perSeason = await Promise.all(
        allSeasons.map(s => getWinnersBySeason(env.id, s.id).then(ws => ws.map(w => ({ ...w, season_name: s.name }))))
      );
      setAllWinners(perSeason.flat());

      const activeSeason = allSeasons.find(s => s.is_active) ?? allSeasons[0] ?? null;
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id);
        const activeWinners = perSeason[allSeasons.indexOf(activeSeason)] ?? [];
        setWinners(activeWinners);
      }
      setLoading(false);
    });
  }, [configured]);

  const handleSeasonChange = (sid: string) => {
    if (!envId || sid === selectedSeasonId) return;
    setSearch("");
    setSelectedSeasonId(sid);
    loadWinners(envId, sid);
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
  const isSearching = search.trim().length > 0;

  const searchResults: WinnerWithSeason[] = isSearching
    ? allWinners.filter(w => normalize(w.winner_name ?? '').includes(normalize(search.trim())))
    : [];

  const [latest, ...rest] = winners;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
          <Skeleton className="h-12 w-64 mx-auto rounded-xl" />
          <div className="flex gap-2 justify-center"><Skeleton className="h-9 w-20 rounded-lg" /><Skeleton className="h-9 w-20 rounded-lg" /><Skeleton className="h-9 w-20 rounded-lg" /></div>
          <Skeleton className="h-10 w-72 mx-auto rounded-lg" />
          <Skeleton className="h-80 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-xs font-medium mb-4">
            <Crown className="h-3 w-3" /> Hall of Fame
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
            Hall of{" "}
            <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">Fame</span>
          </h1>
          <p className="text-text-secondary text-lg">Les meilleures captures MSFS de chaque concours.</p>
        </motion.div>

        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="flex justify-center mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un pseudo sur toutes les années…"
              className="w-full pl-9 pr-9 py-2 rounded-lg bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan/40 transition-colors"
            />
            {isSearching && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Season selector — hidden while searching */}
        {!isSearching && seasons.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex items-center justify-center gap-2 flex-wrap mb-10">
            {seasons.map(s => (
              <button
                key={s.id}
                onClick={() => handleSeasonChange(s.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  selectedSeasonId === s.id
                    ? 'bg-cyan/10 border-cyan/30 text-cyan'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                🏆 {s.name}
                {s.is_active && <span className="ml-1.5 text-[10px] text-cyan font-semibold uppercase tracking-wide">en cours</span>}
              </button>
            ))}
          </motion.div>
        )}

        {/* Search results — all seasons */}
        {isSearching && (
          <>
            <p className="text-sm text-text-muted text-center mb-6">
              {searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''} sur toutes les années
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">Aucun résultat pour &quot;{search}&quot;.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((winner, idx) => (
                  <motion.div key={`${winner.id}-${idx}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Card className="glass overflow-hidden group glass-hover transition-all duration-300">
                      <div className="relative h-48 overflow-hidden bg-surface-2">
                        {winner.image_url ? (
                          <Image src={winner.image_url} alt="screenshot" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Trophy className="w-8 h-8 text-text-muted" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <Badge variant="cyan" className="text-[10px] gap-1"><Crown className="h-2.5 w-2.5" />{winner.season_name}</Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={winner.winner_avatar ?? undefined} alt={winner.winner_name ?? ''} />
                            <AvatarFallback>{(winner.winner_name ?? '?')[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{winner.winner_name}</p>
                            <p className="text-xs text-text-muted">{formatPeriod(winner.started_at, winner.closed_at)}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
                            <ThumbsUp className="h-3 w-3 text-cyan" />{winner.vote_count}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Normal season view */}
        {!isSearching && (
          <>
            {/* Loading season */}
            {seasonLoading && (
              <div className="space-y-6">
                <Skeleton className="h-80 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                </div>
              </div>
            )}

            {!seasonLoading && winners.length === 0 && (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted mb-2">Aucun gagnant pour {selectedSeason?.name ?? 'cette année'}.</p>
                <p className="text-xs text-text-muted">Les résultats apparaîtront ici après la clôture du premier concours.</p>
              </div>
            )}

            {!seasonLoading && latest && (
              <>
                {/* Latest winner */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-10">
                  <Card className="glass overflow-hidden border-cyan/20">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="relative h-64 lg:h-auto min-h-[300px] bg-surface-2">
                        {latest.image_url ? (
                          <Image src={latest.image_url} alt={`Screenshot de ${latest.winner_name}`} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Trophy className="w-16 h-16 text-text-muted" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/80 hidden lg:block" />
                        <div className="absolute top-4 left-4">
                          <Badge variant="cyan" className="gap-1"><Crown className="h-3 w-3" />Dernier gagnant {selectedSeason?.name}</Badge>
                        </div>
                      </div>
                      <div className="p-8 flex flex-col justify-center">
                        <div className="text-5xl mb-3">🏆</div>
                        <p className="text-text-muted text-sm mb-6">{formatPeriod(latest.started_at, latest.closed_at)}</p>
                        <div className="flex items-center gap-3 mb-6">
                          <Avatar className="h-10 w-10 border-2 border-cyan/30">
                            <AvatarImage src={latest.winner_avatar ?? undefined} alt={latest.winner_name ?? ''} />
                            <AvatarFallback>{(latest.winner_name ?? '?')[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-text-primary">{latest.winner_name}</p>
                            <p className="text-sm text-text-muted">Photographe de la semaine</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-text-secondary"><ThumbsUp className="h-4 w-4 text-cyan" />{latest.vote_count} votes</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* All other winners */}
                {rest.length > 0 && (
                  <>
                    <h2 className="text-xl font-semibold text-text-primary mb-6">
                      Concours précédents — {selectedSeason?.name}
                      <span className="ml-2 text-sm font-normal text-text-muted">({rest.length} concours)</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rest.map((winner, idx) => (
                        <motion.div key={winner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.04 }}>
                          <Card className="glass overflow-hidden group glass-hover transition-all duration-300">
                            <div className="relative h-48 overflow-hidden bg-surface-2">
                              {winner.image_url ? (
                                <Image src={winner.image_url} alt="screenshot" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                              ) : (
                                <div className="flex items-center justify-center h-full"><Trophy className="w-8 h-8 text-text-muted" /></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                            </div>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={winner.winner_avatar ?? undefined} alt={winner.winner_name ?? ''} />
                                  <AvatarFallback>{(winner.winner_name ?? '?')[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{winner.winner_name}</p>
                                  <p className="text-xs text-text-muted">{formatPeriod(winner.started_at, winner.closed_at)}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
                                  <ThumbsUp className="h-3 w-3 text-cyan" />{winner.vote_count}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
