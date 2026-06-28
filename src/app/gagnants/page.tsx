"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ExternalLink, Calendar, ThumbsUp, Crown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockWinners } from "@/data/mock";

export default function GagnantsPage() {
  const [latest, ...rest] = mockWinners;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-xs font-medium mb-4">
            <Crown className="h-3 w-3" />
            Hall of Fame
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
            Derniers{" "}
            <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
              Gagnants
            </span>
          </h1>
          <p className="text-text-secondary text-lg">
            Les meilleures captures MSFS de chaque semaine.
          </p>
        </motion.div>

        {/* Featured latest winner */}
        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <Card className="glass overflow-hidden border-cyan/20">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative h-64 lg:h-auto min-h-[300px]">
                  <Image
                    src={latest.screenshotUrl}
                    alt={`Screenshot de ${latest.member.username}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/80 hidden lg:block" />
                  <div className="absolute top-4 left-4">
                    <Badge variant="cyan" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Dernier gagnant
                    </Badge>
                  </div>
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <p className="text-text-muted text-sm mb-2">{latest.week} · {latest.period}</p>
                  <h2 className="text-2xl font-bold text-text-primary mb-4">
                    🏆 {latest.member.username}
                  </h2>
                  <div className="flex items-center gap-3 mb-6">
                    <Avatar className="h-10 w-10 border-2 border-cyan/30">
                      <AvatarImage src={latest.member.avatar} alt={latest.member.username} />
                      <AvatarFallback>{latest.member.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-text-primary">{latest.member.username}</p>
                      <p className="text-sm text-text-muted">Photographe de la semaine</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <ThumbsUp className="h-4 w-4 text-cyan" />
                      {latest.votes} votes
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Calendar className="h-4 w-4 text-cyan" />
                      {latest.date}
                    </div>
                  </div>
                  <Button variant="outline" className="w-fit gap-2" asChild>
                    <a href={latest.discordMessageUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Voir sur Discord
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Past winners grid */}
        <h2 className="text-xl font-semibold text-text-primary mb-6">Semaines précédentes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((winner, idx) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
            >
              <Card className="glass overflow-hidden group glass-hover transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={winner.screenshotUrl}
                    alt={`Screenshot de ${winner.member.username}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="default" className="text-xs">
                      {winner.week}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={winner.member.avatar} alt={winner.member.username} />
                      <AvatarFallback>{winner.member.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{winner.member.username}</p>
                      <p className="text-xs text-text-muted">{winner.period}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
                      <ThumbsUp className="h-3 w-3 text-cyan" />
                      {winner.votes}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    asChild
                  >
                    <a href={winner.discordMessageUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Voir sur Discord
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
