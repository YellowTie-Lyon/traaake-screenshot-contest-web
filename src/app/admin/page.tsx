"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  ThumbsUp,
  Zap,
  Play,
  PauseCircle,
  XCircle,
  RefreshCw,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockCurrentContest } from "@/data/mock";

const mockAction = (label: string) => {
  toast.success(`${label} — Action mockée. Connectez Supabase en Phase 2.`);
};

export default function AdminDashboard() {
  const contest = mockCurrentContest;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8 max-w-5xl">
        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: "Statut", value: "OUVERT", icon: Zap, color: "text-green-400", badge: "open" as const },
            { label: "Début", value: contest.startDate, icon: Play, color: "text-cyan" },
            { label: "Participations", value: contest.participations.toString(), icon: Users, color: "text-text-primary" },
            { label: "Votes", value: contest.totalVotes.toString(), icon: ThumbsUp, color: "text-cyan" },
          ].map((stat, i) => (
            <Card key={i} className="glass">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  {stat.badge && <Badge variant={stat.badge}>●</Badge>}
                </div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-text-muted mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leader */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-cyan" />
                  Leader actuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contest.leader ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-yellow-500/50">
                      <AvatarImage src={contest.leader.avatar} alt={contest.leader.username} />
                      <AvatarFallback>{contest.leader.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-text-primary text-lg">{contest.leader.username}</p>
                      <p className="text-sm text-text-secondary">{contest.leader.points.toLocaleString()} points</p>
                      <p className="text-xs text-text-muted mt-0.5">{contest.leader.wins} victoires · {contest.leader.participations} part.</p>
                    </div>
                    <span className="text-3xl ml-auto">🥇</span>
                  </div>
                ) : (
                  <p className="text-text-muted">Aucun participant pour le moment</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Bot status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan" />
                  Statut du Bot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-medium">En ligne</span>
                </div>
                <p className="text-sm text-text-secondary">Canal : <span className="text-text-primary">{mockCurrentContest.id}</span></p>
                <p className="text-sm text-text-secondary">Mode : <span className="text-cyan">Automatique</span></p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => mockAction("Suspendre le concours")} className="gap-2">
                  <PauseCircle className="h-4 w-4" /> Suspendre
                </Button>
                <Button variant="outline" onClick={() => mockAction("Réouvrir le concours")} className="gap-2">
                  <Play className="h-4 w-4" /> Réouvrir
                </Button>
                <Button variant="destructive" onClick={() => mockAction("Fermer le concours")} className="gap-2">
                  <XCircle className="h-4 w-4" /> Fermer
                </Button>
                <Button variant="secondary" onClick={() => mockAction("Recalculer les votes")} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Recalculer les votes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
