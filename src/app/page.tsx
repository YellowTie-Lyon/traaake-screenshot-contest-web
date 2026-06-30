"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Trophy, Heart, Star, Award, ChevronDown, Camera,
  Twitch, Users, Plane, AlertCircle, Loader2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSeasonLeaderboard,
  getActiveContestLeaderboard,
  getActiveContestPublic,
  getActiveEnvironment,
  getRecentWinners,
  getSeasonTotalVotes,
  type LeaderboardEntry,
  type CurrentContestEntry,
  type WinnerEntry,
} from "@/features/public/api";
import { supabase } from "@/lib/supabase/client";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatPeriod(start: string | null, end: string | null) {
  if (!start) return "";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (!end) return `Depuis le ${fmt(start)}`;
  return `Du ${fmt(start)} au ${fmt(end)}`;
}

const rankColors: Record<number, string> = { 1: "#f59e0b", 2: "#9ca3af", 3: "#b45309" };
const rankEmojis: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const RULES = [
  "Les screenshots doivent provenir **uniquement** de Microsoft Flight Simulator 2020 & 2024 !",
  "Un **seul** screenshot, supprimez l'ancien pour en poster un nouveau",
  "Les screenshots doivent **vous appartenir**, sous peine de sanctions",
  "Les **streamers/youtubers** ne peuvent pas participer au concours",
  "Les screenshots jugés troll, offensant ou inapproprié par les modérateurs seront supprimés",
  "Le concours screenshots est relancé chaque mercredi soir",
];

function RuleText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p className="text-sm text-text-secondary leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="text-text-primary font-semibold">{part}</strong> : part
      )}
    </p>
  );
}

// ─── Section: Hero ────────────────────────────────────────────────────────────

function HeroSection({ contestOpen }: { contestOpen: boolean }) {
  return (
    <section id="hero" className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-24 overflow-hidden">
      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan/5 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative space-y-6 max-w-3xl">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-cyan uppercase tracking-widest">
          <Plane className="w-4 h-4" />
          Microsoft Flight Simulator 2020 &amp; 2024
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-text-primary leading-tight">
          Concours{" "}
          <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
            Screenshot
          </span>
        </h1>

        <p className="text-lg text-text-secondary max-w-xl mx-auto">
          Chaque semaine, partagez votre plus beau screenshot de Flight Simulator sur le serveur Discord.
          Le plus voté remporte le titre de{" "}
          <strong className="text-text-primary">Photographe de la semaine</strong> 🎉
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          {contestOpen && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Concours en cours
            </span>
          )}
          <a
            href="https://discord.gg/Qc459c4Pzr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752C4] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
            Rejoindre le Discord
          </a>
          <a
            href="#participer"
            onClick={e => { e.preventDefault(); document.getElementById("participer")?.scrollIntoView({ behavior: "smooth" }); }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:text-text-primary hover:border-border-subtle transition-colors"
          >
            Comment participer <ChevronDown className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Section: Participer ──────────────────────────────────────────────────────

function ParticiperSection() {
  return (
    <section id="participer" className="py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
          <p className="text-xs font-semibold text-cyan uppercase tracking-widest">Comment participer</p>
          <h2 className="text-3xl font-bold text-text-primary">Rejoignez le concours</h2>
          <p className="text-text-secondary max-w-lg mx-auto">
            Postez votre screenshot sur le salon dédié du serveur Discord chaque semaine.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: "1️⃣", title: "Rejoignez le Discord", desc: "Rejoignez le serveur Discord de TraaaKe et rendez-vous sur le salon concours.", cta: { label: "Rejoindre", href: "https://discord.gg/Qc459c4Pzr" } },
            { icon: "2️⃣", title: "Postez votre screenshot", desc: "Partagez votre plus beau screenshot de MSFS 2020 ou 2024 dans le salon dédié." },
            { icon: "3️⃣", title: "Récoltez des ❤️", desc: "Les autres membres votent avec le cœur ❤️. Le plus voté gagne le titre !" },
          ].map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="glass p-6 h-full flex flex-col gap-4 text-center">
                <span className="text-3xl">{step.icon}</span>
                <h3 className="font-semibold text-text-primary">{step.title}</h3>
                <p className="text-sm text-text-secondary flex-1">{step.desc}</p>
                {step.cta && (
                  <a href={step.cta.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] text-xs font-medium hover:bg-[#5865F2]/20 transition-colors">
                    {step.cta.label}
                  </a>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Rules */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card className="glass p-6 sm:p-8 space-y-5">
            <h3 className="text-xs font-semibold text-cyan uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> Règles du concours
            </h3>
            <ul className="space-y-3">
              {RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-cyan mt-0.5 flex-shrink-0">🔷</span>
                  <RuleText text={rule} />
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section: Streamer ────────────────────────────────────────────────────────

function StreamerSection() {
  return (
    <section id="streamer" className="py-20 px-4 bg-surface/30">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card className="glass overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-8 p-8">
              <div className="flex-shrink-0">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#9146FF]/30 bg-surface-2">
                  <Image src="/logo.png" alt="TraaaKe" width={112} height={112} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#9146FF] uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1.5">
                    <Twitch className="w-3.5 h-3.5" /> Streamer Twitch
                  </p>
                  <h2 className="text-2xl font-bold text-text-primary">TraaaKe</h2>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
                  Passionné de simulation aérienne, je streame Microsoft Flight Simulator sur Twitch et j'ai créé ce concours screenshot pour rassembler la communauté autour des plus belles captures du jeu.
                  Chaque semaine, le meilleur photographe est mis à l'honneur ! ✈️
                </p>
                <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                  <a href="https://twitch.tv/traaake" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9146FF] text-white text-xs font-semibold hover:bg-[#7d35e0] transition-colors">
                    <Twitch className="w-3.5 h-3.5" /> Voir le stream
                  </a>
                  <a href="https://discord.gg/Qc459c4Pzr" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#5865F2]/30 text-[#5865F2] text-xs font-semibold hover:bg-[#5865F2]/10 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                    Serveur Discord
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section: Classement ──────────────────────────────────────────────────────

interface ActiveContest {
  id: string;
  status: string;
  total_participations: number;
  total_votes: number;
  ends_at: string | null;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="glass p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0 text-cyan">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-bold text-text-primary truncate">{value}</p>
      </div>
    </Card>
  );
}

function Podium({ entries, nameKey, scoreKey, scoreIcon, scoreUnit }: {
  entries: (LeaderboardEntry | CurrentContestEntry)[];
  nameKey: "discord_display_name" | "discord_username";
  scoreKey: "total_points" | "vote_count";
  scoreIcon: React.ReactNode;
  scoreUnit?: string;
}) {
  const [first, second, third] = entries;
  if (!first) return null;

  const PodiumCard = ({ entry, rank }: { entry: LeaderboardEntry | CurrentContestEntry; rank: number }) => {
    const name = (entry as LeaderboardEntry).discord_display_name ?? (entry as LeaderboardEntry).discord_username ?? "?";
    const score = scoreKey === "total_points" ? (entry as LeaderboardEntry).total_points : (entry as CurrentContestEntry).vote_count;
    const avatar = entry.avatar_url;
    const heights: Record<number, string> = { 1: "h-36", 2: "h-28", 3: "h-24" };
    const podiumColors: Record<number, string> = { 1: "border-amber-400/40 bg-amber-400/5", 2: "border-slate-400/30 bg-slate-400/5", 3: "border-amber-700/30 bg-amber-700/5" };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: rank * 0.08 }}
        className="flex flex-col items-center gap-2 flex-1"
      >
        <div className="text-xl">{rankEmojis[rank]}</div>
        <Avatar className={`border-2 flex-shrink-0 ${rank === 1 ? "h-14 w-14 border-amber-400/50" : "h-11 w-11 border-slate-400/30"}`}>
          <AvatarImage src={avatar ?? undefined} />
          <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className={`font-semibold text-text-primary truncate max-w-[100px] ${rank === 1 ? "text-sm" : "text-xs"}`}>{name}</p>
          <div className="flex items-center justify-center gap-1 text-xs font-bold mt-0.5" style={{ color: rankColors[rank] }}>
            {scoreIcon}
            {score.toLocaleString()}{scoreUnit}
          </div>
        </div>
        <div className={`w-full ${heights[rank]} rounded-t-xl border ${podiumColors[rank]} flex items-center justify-center`}>
          <span className="text-2xl font-black opacity-20">{rank}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex items-end gap-2 sm:gap-3 px-2 mb-2">
      {second ? <PodiumCard entry={second} rank={2} /> : <div className="flex-1" />}
      <PodiumCard entry={first} rank={1} />
      {third ? <PodiumCard entry={third} rank={3} /> : <div className="flex-1" />}
    </div>
  );
}

function ClassementSection() {
  const [tab, setTab] = useState<"saison" | "concours">("saison");
  const [season, setSeason] = useState<LeaderboardEntry[]>([]);
  const [contest, setContest] = useState<CurrentContestEntry[]>([]);
  const [activeContest, setActiveContest] = useState<ActiveContest | null>(null);
  const [loading, setLoading] = useState(true);
  const [envId, setEnvId] = useState("");
  const [seasonTotalVotes, setSeasonTotalVotes] = useState(0);

  const loadData = useCallback(async (eid: string) => {
    const [s, a, votes] = await Promise.all([
      getSeasonLeaderboard(),
      getActiveContestPublic(eid),
      getSeasonTotalVotes(),
    ]);
    setSeason(s);
    setActiveContest(a as ActiveContest | null);
    setSeasonTotalVotes(votes);
    if (a) {
      const c = await getActiveContestLeaderboard(eid);
      setContest(c);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    getActiveEnvironment().then(env => {
      if (!env) { setLoading(false); return; }
      setEnvId(env.id);
      loadData(env.id);
    });
  }, [loadData]);

  useEffect(() => {
    if (!supabase || !activeContest?.id) return;
    const channel = supabase
      .channel(`contest-live-${activeContest.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "participations" }, () => {
        if (envId) getActiveContestLeaderboard(envId).then(setContest);
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [activeContest?.id, envId]);

  // Season derived stats
  const seasonTotalParts = season.reduce((s, e) => s + e.participations, 0);
  const topWinner = season.reduce<LeaderboardEntry | null>((best, e) => (e.wins > (best?.wins ?? 0) ? e : best), null);

  // Contest derived stats
  const contestLeader = contest[0] ?? null;

  const [top3Season, restSeason] = [season.slice(0, 3), season.slice(3)];
  const [top3Contest, restContest] = [contest.slice(0, 3), contest.slice(3)];

  return (
    <section id="classement" className="py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
          <p className="text-xs font-semibold text-cyan uppercase tracking-widest">Classements</p>
          <h2 className="text-3xl font-bold text-text-primary">Les meilleurs photographes</h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {([
            { key: "saison" as const, label: "Saison en cours", icon: Star },
            { key: "concours" as const, label: "Concours en cours", icon: Trophy },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              disabled={key === "concours" && !activeContest}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? "border-cyan text-cyan" : "border-transparent text-text-muted hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {key === "concours" && activeContest && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : tab === "saison" ? (
          <div className="space-y-6">
            {/* Season stats */}
            {season.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<Users className="w-4 h-4" />}
                  label="Participations saison"
                  value={seasonTotalParts.toLocaleString()}
                />
                <StatCard
                  icon={<Trophy className="w-4 h-4" />}
                  label="Plus de victoires"
                  value={topWinner && topWinner.wins > 0
                    ? `${topWinner.discord_display_name ?? topWinner.discord_username} (${topWinner.wins})`
                    : "—"}
                />
                <StatCard
                  icon={<Heart className="w-4 h-4" />}
                  label="Votes cumulés saison"
                  value={seasonTotalVotes.toLocaleString()}
                />
              </div>
            )}

            {/* Podium */}
            {season.length === 0 ? (
              <Card className="glass p-10 text-center"><p className="text-text-muted text-sm">Aucune donnée pour cette saison.</p></Card>
            ) : (
              <>
                <Podium
                  entries={top3Season}
                  nameKey="discord_display_name"
                  scoreKey="total_points"
                  scoreIcon={<Star className="w-3 h-3" />}
                  scoreUnit=" pts"
                />
                {/* Rest */}
                <div className="space-y-2">
                  {restSeason.map((m, i) => (
                    <motion.div key={m.discord_user_id} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                      <Card className="glass flex items-center gap-4 px-5 py-3">
                        <span className="w-8 text-center font-bold text-sm text-text-muted flex-shrink-0">{m.rank}</span>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback>{(m.discord_display_name ?? m.discord_username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{m.discord_display_name ?? m.discord_username}</p>
                          <p className="text-xs text-text-muted">{m.participations} part. · {m.wins} victoire{m.wins !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 font-bold text-sm flex-shrink-0">
                          <Star className="w-3.5 h-3.5" />
                          {m.total_points.toLocaleString()}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Contest stats */}
            {activeContest && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<Users className="w-4 h-4" />}
                  label="Participations"
                  value={activeContest.total_participations.toLocaleString()}
                />
                <StatCard
                  icon={<Heart className="w-4 h-4" />}
                  label="Votes au total"
                  value={activeContest.total_votes.toLocaleString()}
                />
                <StatCard
                  icon={<Trophy className="w-4 h-4" />}
                  label="Leader actuel"
                  value={contestLeader
                    ? `${contestLeader.discord_display_name ?? contestLeader.discord_username ?? "?"} · ${contestLeader.vote_count} ❤️`
                    : "—"}
                />
              </div>
            )}

            {/* Podium */}
            {contest.length === 0 ? (
              <Card className="glass p-10 text-center"><p className="text-text-muted text-sm">Aucune participation pour l'instant.</p></Card>
            ) : (
              <>
                <Podium
                  entries={top3Contest}
                  nameKey="discord_display_name"
                  scoreKey="vote_count"
                  scoreIcon={<Heart className="w-3 h-3" />}
                />
                {/* Rest */}
                <div className="space-y-2">
                  {restContest.map((m, i) => (
                    <motion.div key={m.participation_id} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                      <Card className="glass flex items-center gap-4 px-5 py-3">
                        <span className="w-8 text-center font-bold text-sm text-text-muted flex-shrink-0">{m.rank}</span>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback>{(m.discord_display_name ?? m.discord_username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{m.discord_display_name ?? m.discord_username}</p>
                          {m.image_url && <p className="text-xs text-text-muted">Screenshot soumis</p>}
                        </div>
                        {m.image_url && (
                          <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 border border-border">
                            <Image src={m.image_url} alt="screenshot" width={48} height={32} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-red-400 font-bold text-sm flex-shrink-0">
                          <Heart className="w-3.5 h-3.5" />
                          {m.vote_count}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section: Gagnants ────────────────────────────────────────────────────────

const WINNERS_PAGE_SIZE = 6;

function GagnantsSection() {
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [displayed, setDisplayed] = useState(WINNERS_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    getActiveEnvironment().then(env => {
      if (!env) { setLoading(false); return; }
      getRecentWinners(env.id, 50).then(w => { setWinners(w); setLoading(false); });
    });
  }, []);

  const visible = winners.slice(0, displayed);
  const hasMore = displayed < winners.length;

  return (
    <section id="gagnants" className="py-20 px-4 bg-surface/30">
      <div className="max-w-6xl mx-auto space-y-10">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
          <p className="text-xs font-semibold text-cyan uppercase tracking-widest">Hall of Fame</p>
          <h2 className="text-3xl font-bold text-text-primary">Derniers gagnants</h2>
          <p className="text-text-secondary">Les photographes de la semaine et leurs plus belles captures.</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : winners.length === 0 ? (
          <Card className="glass p-12 text-center">
            <Trophy className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">Aucun gagnant pour l'instant.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % WINNERS_PAGE_SIZE) * 0.06 }}
                >
                  <Card className="glass overflow-hidden group cursor-pointer hover:border-cyan/30 transition-colors"
                    onClick={() => w.image_url && setLightbox(w.image_url)}>
                    {/* Screenshot */}
                    <div className="relative h-52 bg-surface-2 overflow-hidden">
                      {w.image_url ? (
                        <Image
                          src={w.image_url}
                          alt={`Screenshot de ${w.winner_name}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-10 h-10 text-text-muted" />
                        </div>
                      )}
                      {/* Overlay top: badge */}
                      <div className="absolute top-3 left-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-400">
                          🏆 Photographe de la semaine
                        </span>
                      </div>
                      {/* Overlay bottom: votes */}
                      <div className="absolute bottom-3 right-3">
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-black/60 text-red-400">
                          <Heart className="w-3 h-3" /> {w.vote_count}
                        </span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4 flex items-center gap-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={w.winner_avatar ?? undefined} />
                        <AvatarFallback>{(w.winner_name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{w.winner_name ?? "Anonyme"}</p>
                        <p className="text-xs text-text-muted">{formatPeriod(w.started_at, w.closed_at)}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={() => setDisplayed(d => d + WINNERS_PAGE_SIZE)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-text-secondary text-sm font-medium hover:text-text-primary hover:border-border-subtle hover:bg-surface-2 transition-colors"
                >
                  <Award className="w-4 h-4" />
                  Voir plus ({winners.length - displayed} restants)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh]">
            <Image
              src={lightbox}
              alt="Screenshot"
              width={1920}
              height={1080}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [contestOpen, setContestOpen] = useState(false);

  useEffect(() => {
    getActiveEnvironment().then(env => {
      if (!env) return;
      getActiveContestPublic(env.id).then(c => setContestOpen(!!c));
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection contestOpen={contestOpen} />
        <ParticiperSection />
        <StreamerSection />
        <ClassementSection />
        <GagnantsSection />
      </main>
      <Footer />
    </div>
  );
}
