"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SupabaseBanner } from "@/components/admin/SupabaseBanner";
import { EnvironmentBadge } from "@/components/admin/EnvironmentBadge";
import { getEnvironments, getEnvironmentWithSettings } from "@/features/environments/api";
import { upsertSettings } from "@/features/settings/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import type { DbContestSettings, DbEnvironment, EnvironmentName } from "@/lib/supabase/types";

const DAYS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const DEFAULT_FORM = {
  guild_id: '',
  contest_channel_id: '',
  admin_role_id: '',
  photographer_role_id: '',
  announcement_message: '📸 Le concours screenshot est ouvert ! Postez vos plus belles captures dans ce salon.',
  allowed_reaction: '❤️',
  open_day: 'wednesday',
  open_time: '18:00',
  close_day: 'wednesday',
  close_time: '20:00',
  timezone: 'Europe/Paris',
  participation_points: 5,
  top_3_points: 15,
  winner_points: 50,
  auto_mode_enabled: false,
  delete_invalid_messages: true,
  delete_invalid_reactions: true,
  allow_text: false,
  allow_video: false,
};

function DaySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50"
    >
      {DAYS.map(d => (
        <option key={d.value} value={d.value}>{d.label}</option>
      ))}
    </select>
  );
}

export default function ReglagesPage() {
  const configured = isSupabaseConfigured();
  const [environments, setEnvironments] = useState<DbEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [settings, setSettings] = useState<DbContestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    getEnvironments().then(envs => {
      setEnvironments(envs);
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) setSelectedEnvId(active.id);
    }).finally(() => setLoading(false));
  }, [configured]);

  useEffect(() => {
    if (!selectedEnvId || !configured) return;
    setLoading(true);
    const env = environments.find(e => e.id === selectedEnvId);
    if (!env) return;
    getEnvironmentWithSettings(env.name).then(data => {
      if (data?.settings) {
        setSettings(data.settings);
        const s = data.settings;
        setForm({
          guild_id: s.guild_id ?? '',
          contest_channel_id: s.contest_channel_id ?? '',
          admin_role_id: s.admin_role_id ?? '',
          photographer_role_id: s.photographer_role_id ?? '',
          announcement_message: s.announcement_message ?? DEFAULT_FORM.announcement_message,
          allowed_reaction: s.allowed_reaction,
          open_day: s.open_day,
          open_time: s.open_time,
          close_day: s.close_day,
          close_time: s.close_time,
          timezone: s.timezone,
          participation_points: s.participation_points,
          top_3_points: s.top_3_points,
          winner_points: s.winner_points,
          auto_mode_enabled: s.auto_mode_enabled,
          delete_invalid_messages: s.delete_invalid_messages,
          delete_invalid_reactions: s.delete_invalid_reactions,
          allow_text: s.allow_text,
          allow_video: s.allow_video,
        });
      } else {
        setSettings(null);
        setForm(DEFAULT_FORM);
      }
    }).finally(() => setLoading(false));
  }, [selectedEnvId, configured, environments]);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!configured || !selectedEnvId) return;
    setSaving(true);
    try {
      if (settings) {
        await upsertSettings(selectedEnvId, form);
      } else {
        await upsertSettings(selectedEnvId, form);
      }
      toast.success("Réglages sauvegardés");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Réglages">
      <div className="max-w-3xl space-y-8">
        {!configured && <SupabaseBanner />}

        {configured && environments.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">Environnement :</span>
            {environments.map(env => (
              <button
                key={env.id}
                onClick={() => setSelectedEnvId(env.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedEnvId === env.id
                    ? 'bg-cyan/10 border-cyan/30 text-cyan'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                <EnvironmentBadge env={env.name as EnvironmentName} />
                {env.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Discord */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Discord</h2>
                <p className="text-xs text-text-muted">Ces IDs sont automatiquement remplis depuis l'onglet Discord après avoir configuré un serveur.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Guild ID (Serveur)</Label>
                    <Input value={form.guild_id} onChange={e => setField('guild_id', e.target.value)} placeholder="123456789012345678" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Salon concours ID</Label>
                    <Input value={form.contest_channel_id} onChange={e => setField('contest_channel_id', e.target.value)} placeholder="123456789012345678" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle admin ID</Label>
                    <Input value={form.admin_role_id} onChange={e => setField('admin_role_id', e.target.value)} placeholder="123456789012345678" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle photographe ID</Label>
                    <Input value={form.photographer_role_id} onChange={e => setField('photographer_role_id', e.target.value)} placeholder="123456789012345678" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Réaction de vote</Label>
                    <Input value={form.allowed_reaction} onChange={e => setField('allowed_reaction', e.target.value)} placeholder="❤️" className="w-24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message d&apos;annonce du concours</Label>
                  <Textarea
                    value={form.announcement_message}
                    onChange={e => setField('announcement_message', e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Message posté par le bot lors de l'ouverture du concours..."
                  />
                </div>
              </Card>
            </motion.div>

            {/* Horaires */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Horaires automatiques</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jour d&apos;ouverture</Label>
                    <DaySelect value={form.open_day} onChange={v => setField('open_day', v)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure d&apos;ouverture</Label>
                    <Input type="time" value={form.open_time} onChange={e => setField('open_time', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Jour de clôture</Label>
                    <DaySelect value={form.close_day} onChange={v => setField('close_day', v)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure de clôture</Label>
                    <Input type="time" value={form.close_time} onChange={e => setField('close_time', e.target.value)} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Timezone</Label>
                    <Input value={form.timezone} onChange={e => setField('timezone', e.target.value)} placeholder="Europe/Paris" />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Points */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Points</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Participation</Label>
                    <Input type="number" min={0} value={form.participation_points} onChange={e => setField('participation_points', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Top 3</Label>
                    <Input type="number" min={0} value={form.top_3_points} onChange={e => setField('top_3_points', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gagnant</Label>
                    <Input type="number" min={0} value={form.winner_points} onChange={e => setField('winner_points', Number(e.target.value))} />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Options */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Options du bot</h2>
                {[
                  { key: 'auto_mode_enabled' as const, label: 'Mode automatique', desc: 'Ouverture/clôture automatique selon les horaires définis ci-dessus' },
                  { key: 'delete_invalid_messages' as const, label: 'Supprimer messages invalides', desc: 'Le bot supprime les messages sans image dans le salon concours' },
                  { key: 'delete_invalid_reactions' as const, label: 'Supprimer réactions invalides', desc: 'Le bot supprime les réactions autres que celle autorisée' },
                  { key: 'allow_text' as const, label: 'Autoriser texte', desc: 'Messages texte acceptés en plus des images' },
                  { key: 'allow_video' as const, label: 'Autoriser vidéos', desc: 'Vidéos acceptées comme participations' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted">{desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={form[key]}
                      onClick={() => setField(key, !form[key])}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${form[key] ? 'bg-cyan' : 'bg-surface-2 border border-border'}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </Card>
            </motion.div>

            <Button className="gap-2" onClick={handleSave} disabled={saving || !configured}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder les réglages'}
            </Button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
