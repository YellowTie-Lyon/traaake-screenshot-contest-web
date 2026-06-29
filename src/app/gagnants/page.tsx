"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Calendar, ThumbsUp, Crown, Trophy } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { mockWinners } from "@/data/mock";
import { getRecentWinners, getActiveEnvironment, type WinnerEntry } from "@/features/public/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

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

export default function GagnantsPage() {
  const configured = isSupabaseConfigured();
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    getActiveEnvironment().then(env => {
      if (!env) { setLoading(false); return; }
      getRecentWinners(env.id, 10).then(setWinners).finally(() => setLoading(false));
    });
  }, [configured]);

  const hasRealData = configured && !loading && winners.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
          <Skeleton className="h-12 w-64 mx-auto rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  const displayWinners = hasRealData ? winners : null;
  const [latest, ...rest] = displayWinners ?? [];
  const [latestMock, ...restMock] = mockWinners;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-xs font-medium mb-4">
            <Crown className="h-3 w-3" /> Hall of Fame
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
            Derniers{" "}
            <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">Gagnants</span>
          </h1>
          <p className="text-text-secondary text-lg">Les meilleures captures MSFS de chaque concours.</p>
        </motion.div>

        {/* No data yet */}
        {configured && !loading && !hasRealData && (
          <div className="text-center py-16 mb-8">
            <Trophy className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted mb-2">Aucun gagnant pour l'instant.</p>
            <p className="text-xs text-text-muted">Les résultats apparaîtront ici après la clôture du premier concours.</p>
          </div>
        )}

        {/* Latest winner — real data */}
        {latest && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-12">
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
                    <Badge variant="cyan" className="gap-1"><Crown className="h-3 w-3" />Dernier gagnant</Badge>
                  </div>
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <p className="text-text-muted text-sm mb-2">{formatPeriod(latest.started_at, latest.closed_at)}</p>
                  <h2 className="text-2xl font-bold text-text-primary mb-4">🏆</h2>
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
        )}

        {/* Latest winner — mock fallback */}
        {!hasRealData && latestMock && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-12">
            <Card className="glass overflow-hidden border-cyan/20">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative h-64 lg:h-auto min-h-[300px]">
                  <Image src={latestMock.screenshotUrl} alt={`Screenshot de ${latestMock.member.username}`} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/80 hidden lg:block" />
                  <div className="absolute top-4 left-4">
                    <Badge variant="cyan" className="gap-1"><Crown className="h-3 w-3" />Dernier gagnant</Badge>
                  </div>
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <p className="text-text-muted text-sm mb-2">{latestMock.week} · {latestMock.period}</p>
                  <h2 className="text-2xl font-bold text-text-primary mb-4">🏆 {latestMock.member.username}</h2>
                  <div className="flex items-center gap-3 mb-6">
                    <Avatar className="h-10 w-10 border-2 border-cyan/30">
                      <AvatarImage src={latestMock.member.avatar} alt={latestMock.member.username} />
                      <AvatarFallback>{latestMock.member.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-text-primary">{latestMock.member.username}</p>
                      <p className="text-sm text-text-muted">Photographe de la semaine</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-text-secondary"><ThumbsUp className="h-4 w-4 text-cyan" />{latestMock.votes} votes</div>
                    <div className="flex items-center gap-1.5 text-text-secondary"><Calendar className="h-4 w-4 text-cyan" />{latestMock.date}</div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Past winners */}
        {(hasRealData ? rest : restMock).length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-text-primary mb-6">Concours précédents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hasRealData ? (
                (rest as WinnerEntry[]).map((winner, idx) => (
                  <motion.div key={winner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + idx * 0.08 }}>
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
                ))
              ) : (
                restMock.map((winner, idx) => (
                  <motion.div key={winner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + idx * 0.1 }}>
                    <Card className="glass overflow-hidden group glass-hover transition-all duration-300">
                      <div className="relative h-48 overflow-hidden">
                        <Image src={winner.screenshotUrl} alt={`Screenshot de ${winner.member.username}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        <div className="absolute bottom-3 left-3"><Badge variant="default" className="text-xs">{winner.week}</Badge></div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={winner.member.avatar} alt={winner.member.username} />
                            <AvatarFallback>{winner.member.username[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{winner.member.username}</p>
                            <p className="text-xs text-text-muted">{winner.period}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
                            <ThumbsUp className="h-3 w-3 text-cyan" />{winner.votes}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
