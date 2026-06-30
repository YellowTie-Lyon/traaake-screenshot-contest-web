"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, Star, Image as ImageIcon, X, ChevronRight, Search, Heart, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { getMembers, getMemberProfile, type Member, type MemberProfile } from "@/features/membres/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

const rankEmoji: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function MemberDrawer({ member, onClose }: { member: MemberProfile; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative ml-auto w-full max-w-lg h-full glass border-l border-border overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-cyan/30">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl">
                  {(member.discord_display_name ?? member.discord_username ?? '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {member.discord_display_name ?? member.discord_username ?? 'Inconnu'}
                </p>
                {member.discord_username && member.discord_display_name && (
                  <p className="text-sm text-text-muted">@{member.discord_username}</p>
                )}
                <p className="text-xs text-text-muted font-mono mt-0.5">{member.discord_user_id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Points", value: member.total_points, icon: Star, color: "text-cyan" },
              { label: "Victoires", value: member.win_count, icon: Trophy, color: "text-yellow-400" },
              { label: "Participations", value: member.participation_count, icon: Users, color: "text-text-primary" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface-2 rounded-xl p-3 border border-border-subtle text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            ))}
          </div>

          {/* Participations history */}
          <div>
            <h3 className="text-xs font-semibold text-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" /> Historique des participations ({member.participations.length})
            </h3>
            {member.participations.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Aucune participation</p>
            ) : (
              <div className="space-y-2">
                {member.participations.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border-subtle">
                    {p.image_url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                        <Image src={p.image_url} alt="screenshot" width={56} height={56} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg flex-shrink-0 border border-border bg-surface flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{p.contest_title ?? 'Concours sans titre'}</p>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(p.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-cyan flex-shrink-0">
                      <Heart className="w-3.5 h-3.5" /> {p.vote_count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MembresPage() {
  const configured = isSupabaseConfigured();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(configured);
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<MemberProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMembers();
    setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    load();
  }, [configured, load]);

  async function openProfile(member: Member) {
    setLoadingProfile(true);
    const profile = await getMemberProfile(member.id);
    setSelectedProfile(profile);
    setLoadingProfile(false);
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (
      (m.discord_display_name ?? '').toLowerCase().includes(q) ||
      (m.discord_username ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout title="Membres">
      <AnimatePresence>
        {selectedProfile && (
          <MemberDrawer member={selectedProfile} onClose={() => setSelectedProfile(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-4xl space-y-6">
        {/* Stats summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
          {[
            { label: "Membres actifs", value: loading ? '…' : members.filter(m => m.participation_count > 0).length, icon: Users },
            { label: "Gagnants uniques", value: loading ? '…' : members.filter(m => m.win_count > 0).length, icon: Trophy },
            { label: "Participations totales", value: loading ? '…' : members.reduce((s, m) => s + m.participation_count, 0), icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass">
              <div className="p-5 flex items-center gap-4">
                <Icon className="w-5 h-5 text-cyan flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-text-primary">{value}</p>
                  <p className="text-xs text-text-muted">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Search + table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass overflow-hidden">
            {/* Search bar */}
            <div className="p-4 border-b border-border flex items-center justify-between gap-4">
              <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">
                Membres ({filtered.length})
              </h2>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un pseudo…"
                  className="pl-8 pr-8 h-8 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  {search ? `Aucun résultat pour "${search}"` : "Aucun membre enregistré."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-8">#</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Membre</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Victoires</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Participations</th>
                      <th className="px-5 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m, i) => {
                      const rank = members.indexOf(m) + 1;
                      const name = m.discord_display_name ?? m.discord_username ?? 'Inconnu';
                      return (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-surface-2/50 transition-colors cursor-pointer"
                          onClick={() => openProfile(m)}
                        >
                          <td className="px-5 py-3 text-sm text-text-muted font-mono">
                            {rankEmoji[rank] ?? rank}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={m.avatar_url ?? undefined} />
                                <AvatarFallback className="text-xs">{name[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-text-primary">{name}</p>
                                {m.discord_username && m.discord_display_name && (
                                  <p className="text-xs text-text-muted">@{m.discord_username}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-sm font-semibold text-yellow-400">{m.win_count}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-text-secondary">{m.participation_count}</td>
                          <td className="px-5 py-3 text-right">
                            {loadingProfile ? (
                              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-text-muted" />
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
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
