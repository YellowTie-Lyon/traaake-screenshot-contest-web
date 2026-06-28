"use client";

import { motion } from "framer-motion";
import { Trophy, Star, Award, TrendingUp, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockMembers, mockCurrentContest } from "@/data/mock";

const rankColors: Record<number, string> = {
  1: "#f59e0b",
  2: "#9ca3af",
  3: "#b45309",
};

const rankEmojis: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function ClassementPage() {
  const top3 = mockMembers.slice(0, 3);
  const rest = mockMembers.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-xs font-medium mb-4">
            <Zap className="h-3 w-3" />
            Saison 2026 · Semaine {mockCurrentContest.id.split("w")[1]}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
            Classement{" "}
            <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
              Général
            </span>
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Classement cumulatif des pilotes les plus actifs du concours screenshot hebdomadaire MSFS.
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          {[
            { label: "Pilotes actifs", value: mockMembers.length.toString(), icon: Users },
            { label: "Participations (sem.)", value: mockCurrentContest.participations.toString(), icon: TrendingUp },
            { label: "Votes totaux (sem.)", value: mockCurrentContest.totalVotes.toString(), icon: Star },
          ].map((stat) => (
            <Card key={stat.label} className="glass text-center py-4 px-3">
              <div className="flex flex-col items-center gap-1">
                <stat.icon className="h-4 w-4 text-cyan mb-1" />
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Contest banner */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8 p-4 rounded-xl border border-green-700/30 bg-green-900/10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-300 font-medium">
              Concours en cours · Thème : <strong>{mockCurrentContest.theme}</strong>
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {mockCurrentContest.startDate} → {mockCurrentContest.endDate}
          </span>
        </motion.div>

        {/* Podium */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-cyan" />
            Podium
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[top3[1], top3[0], top3[2]].map((member, displayIdx) => {
              const podiumOrder = [2, 1, 3];
              const rank = podiumOrder[displayIdx];
              if (!member) return null;
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + displayIdx * 0.1 }}
                  className={displayIdx === 1 ? "sm:-mt-4" : ""}
                >
                  <Card
                    className="glass text-center p-6 relative overflow-hidden"
                    style={{
                      borderColor: `${rankColors[rank]}40`,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-5"
                      style={{
                        background: `radial-gradient(circle at top, ${rankColors[rank]}, transparent)`,
                      }}
                    />
                    <div className="relative">
                      <div className="text-3xl mb-3">{rankEmojis[rank]}</div>
                      <div className="relative inline-block mb-3">
                        <Avatar className="h-16 w-16 mx-auto border-2" style={{ borderColor: rankColors[rank] }}>
                          <AvatarImage src={member.avatar} alt={member.username} />
                          <AvatarFallback>{member.username[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <h3 className="font-bold text-text-primary text-lg">{member.username}</h3>
                      <p
                        className="text-2xl font-bold mt-1"
                        style={{ color: rankColors[rank] }}
                      >
                        {member.points.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-muted mt-1">points</p>
                      <div className="flex justify-center gap-3 mt-4 text-xs text-text-secondary">
                        <span>{member.wins} victoires</span>
                        <span>·</span>
                        <span>{member.participations} part.</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Full leaderboard */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
            <Award className="h-5 w-5 text-cyan" />
            Classement complet
          </h2>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">Votes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockMembers.map((member, idx) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      className="hover:bg-surface-2/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.rank <= 3 ? (
                          <span className="text-lg">{rankEmojis[member.rank]}</span>
                        ) : (
                          <span className="text-sm font-medium text-text-muted">#{member.rank}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar} alt={member.username} />
                            <AvatarFallback>{member.username[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-text-primary">{member.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className="font-bold"
                          style={{ color: member.rank <= 3 ? rankColors[member.rank] : "#f0f4f8" }}
                        >
                          {member.points.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-text-secondary hidden sm:table-cell">
                        {member.participations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right hidden md:table-cell">
                        {member.wins > 0 ? (
                          <Badge variant="cyan">{member.wins}</Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-text-secondary hidden lg:table-cell">
                        {member.totalVotes}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
