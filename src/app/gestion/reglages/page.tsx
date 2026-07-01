"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Save, Loader2, KeyRound, Eye, EyeOff, Hash, Shield,
  RefreshCw, Bell, Trophy, Settings2, Clock, Image as ImageIcon,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getEnvironments, getEnvironmentWithSettings, saveBotCredentials } from "@/features/environments/api";
import { getGuildConfigs, upsertGuildConfig, getGuildChannels, getGuildRoles } from "@/features/discord/api";
import { upsertSettings } from "@/features/settings/api";
import type {
  DbContestSettings, DbEnvironment, DbDiscordGuildConfig,
  GuildChannel, GuildRole,
} from "@/lib/supabase/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

const SCHEDULE_DAYS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const DEFAULT_FORM = {
  // Contest config
  contest_title: '',
  announcement_message: '📸 Le concours screenshot est ouvert ! Postez vos plus belles captures dans ce salon.',
  // Points
  points_1st: 100,
  points_2nd: 60,
  points_3rd: 30,
  participation_points: 20,
  // Schedule
  auto_mode_enabled: false,
  open_day: 'wednesday',
  open_time: '18:00',
  close_day: 'wednesday',
  close_time: '18:00',
  timezone: 'Europe/Paris',
  // Reminders
  reminder_day: 1,
  reminder_hour: 18,
  reminder_message: '',
  // Tiebreak & closing
  tiebreak_duration_hours: 24,
  warning_minutes: 5,
  // Participation
  promo_interval: 5,
  // Toggles
  is_active: false,
  delete_invalid_messages: true,
  delete_invalid_reactions: true,
  allow_text: false,
  allow_videos: false,
};

const DEFAULT_GUILD_FORM = {
  contest_channel_id: '',
  log_channel_id: '',
  photographer_role_id: '',
  admin_role_id: '',
};

// ---- Sub-components ----

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" /> {title}
    </h2>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-cyan' : 'bg-surface-2 border border-border'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function ChannelSelect({
  value, onChange, channels, loading, onRefresh,
}: {
  value: string;
  onChange: (v: string) => void;
  channels: GuildChannel[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const isEmpty = !loading && channels.length === 0;
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading || isEmpty}
          className="w-full appearance-none bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50 disabled:opacity-50"
        >
          <option value="">
            {loading ? 'Chargement...' : isEmpty ? 'En attente de synchronisation du bot...' : 'Sélectionner un salon...'}
          </option>
          {channels.map(c => (
            <option key={c.channel_id} value={c.channel_id}>#{c.channel_name}</option>
          ))}
        </select>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Actualiser"
        className="px-2.5 rounded-lg border border-border-subtle text-text-muted hover:text-cyan hover:border-cyan/30 transition-colors disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

function RoleSelect({
  value, onChange, roles, loading, onRefresh,
}: {
  value: string;
  onChange: (v: string) => void;
  roles: GuildRole[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const isEmpty = !loading && roles.length === 0;
  const selectedRole = roles.find(r => r.role_id === value);
  const roleColor = selectedRole?.role_color
    ? `#${selectedRole.role_color.toString(16).padStart(6, '0')}`
    : undefined;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        {roleColor && (
          <span
            className="absolute left-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
            style={{ backgroundColor: roleColor }}
          />
        )}
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading || isEmpty}
          className="w-full appearance-none bg-surface-2 border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50 disabled:opacity-50"
          style={roleColor ? { color: roleColor } : undefined}
        >
          <option value="" style={{ color: 'inherit' }}>
            {loading ? 'Chargement...' : isEmpty ? 'En attente de synchronisation du bot...' : 'Sélectionner un rôle...'}
          </option>
          {roles.map(r => {
            const color = r.role_color ? `#${r.role_color.toString(16).padStart(6, '0')}` : undefined;
            return (
              <option key={r.role_id} value={r.role_id} style={color ? { color } : undefined}>
                @{r.role_name}
              </option>
            );
          })}
        </select>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Actualiser"
        className="px-2.5 rounded-lg border border-border-subtle text-text-muted hover:text-cyan hover:border-cyan/30 transition-colors disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// ---- Main page ----

export default function ReglagesPage() {
  const [activeEnv, setActiveEnv] = useState<DbEnvironment | null>(null);
  const [guildConfig, setGuildConfig] = useState<DbDiscordGuildConfig | null>(null);
  const [settings, setSettings] = useState<DbContestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBot, setSavingBot] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [guildForm, setGuildForm] = useState(DEFAULT_GUILD_FORM);

  // Bot credentials
  const [botToken, setBotToken] = useState('');
  const [appId, setAppId] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Discord resources from Supabase
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const loadChannels = useCallback(async (guildId: string) => {
    setLoadingChannels(true);
    const ch = await getGuildChannels(guildId);
    setChannels(ch);
    setLoadingChannels(false);
  }, []);

  const loadRoles = useCallback(async (guildId: string) => {
    setLoadingRoles(true);
    const ro = await getGuildRoles(guildId);
    setRoles(ro);
    setLoadingRoles(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    getEnvironments().then(async envs => {
      const env = envs.find(e => e.is_active) ?? envs[0] ?? null;
      setActiveEnv(env);
      if (!env) { setLoading(false); return; }
      setAppId(env.discord_app_id ?? '');

      const [settingsData, configs] = await Promise.all([
        getEnvironmentWithSettings(env.name),
        getGuildConfigs(env.id),
      ]);

      const guild = configs[0] ?? null;
      setGuildConfig(guild);

      if (guild) {
        setGuildForm({
          contest_channel_id: guild.contest_channel_id ?? '',
          log_channel_id: guild.log_channel_id ?? '',
          photographer_role_id: guild.photographer_role_id ?? '',
          admin_role_id: guild.admin_role_id ?? '',
        });
        loadChannels(guild.guild_id);
        loadRoles(guild.guild_id);
      }

      if (settingsData?.settings) {
        const s = settingsData.settings;
        setSettings(s);
        setForm({
          contest_title: s.contest_title ?? '',
          announcement_message: s.announcement_message ?? DEFAULT_FORM.announcement_message,
          points_1st: s.points_1st ?? 100,
          points_2nd: s.points_2nd ?? 60,
          points_3rd: s.points_3rd ?? 30,
          participation_points: s.participation_points ?? 20,
          auto_mode_enabled: s.auto_mode_enabled ?? false,
          open_day: s.open_day ?? 'wednesday',
          open_time: s.open_time ?? '18:00',
          close_day: s.close_day ?? 'wednesday',
          close_time: s.close_time ?? '18:00',
          timezone: s.timezone ?? 'Europe/Paris',
          reminder_day: s.reminder_day ?? 1,
          reminder_hour: s.reminder_hour ?? 18,
          reminder_message: s.reminder_message ?? '',
          tiebreak_duration_hours: s.tiebreak_duration_hours ?? 24,
          warning_minutes: s.warning_minutes ?? 5,
          promo_interval: s.promo_interval ?? 5,
          is_active: s.is_active ?? false,
          delete_invalid_messages: s.delete_invalid_messages ?? true,
          delete_invalid_reactions: s.delete_invalid_reactions ?? true,
          allow_text: s.allow_text ?? false,
          allow_videos: s.allow_videos ?? false,
        });
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setGuildField<K extends keyof typeof guildForm>(key: K, value: string) {
    setGuildForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSaveBot() {
    if (!activeEnv) return;
    setSavingBot(true);
    try {
      await saveBotCredentials(activeEnv.id, botToken, appId);
      setBotToken('');
      toast.success("Identifiants du bot sauvegardés");
    } catch {
      toast.error("Erreur lors de la sauvegarde des identifiants");
    } finally {
      setSavingBot(false);
    }
  }

  async function handleSave() {
    if (!activeEnv) return;
    setSaving(true);
    try {
      await upsertSettings(activeEnv.id, {
        ...form,
        guild_id: guildConfig?.guild_id ?? settings?.guild_id ?? '',
        contest_channel_id: guildForm.contest_channel_id || null,
        photographer_role_id: guildForm.photographer_role_id || null,
        admin_role_id: guildForm.admin_role_id || null,
        allowed_reaction: settings?.allowed_reaction ?? '❤️',
      });

      if (guildConfig) {
        await upsertGuildConfig(activeEnv.id, {
          ...guildConfig,
          contest_channel_id: guildForm.contest_channel_id || null,
          contest_channel_name: channels.find(c => c.channel_id === guildForm.contest_channel_id)?.channel_name ?? null,
          log_channel_id: guildForm.log_channel_id || null,
          photographer_role_id: guildForm.photographer_role_id || null,
          photographer_role_name: roles.find(r => r.role_id === guildForm.photographer_role_id)?.role_name ?? null,
          admin_role_id: guildForm.admin_role_id || null,
          admin_role_name: roles.find(r => r.role_id === guildForm.admin_role_id)?.role_name ?? null,
        });
      }

      toast.success("Réglages sauvegardés");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  const noGuild = !guildConfig?.guild_id;

  return (
    <AdminLayout title="Réglages">
      <div className="max-w-3xl space-y-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* ── Bot credentials ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={KeyRound} title="Identifiants du bot Discord" />
                <p className="text-xs text-text-muted">Le token n'est jamais affiché après sauvegarde pour des raisons de sécurité.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Application ID</Label>
                    <Input value={appId} onChange={e => setAppId(e.target.value)} placeholder="1234567890123456789" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Bot Token</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={botToken}
                        onChange={e => setBotToken(e.target.value)}
                        placeholder="Laissez vide pour conserver le token actuel"
                        className="font-mono text-xs pr-10"
                      />
                      <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={handleSaveBot} disabled={savingBot || (!botToken && !appId)} className="gap-2">
                  {savingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingBot ? 'Sauvegarde...' : 'Sauvegarder les identifiants'}
                </Button>
              </Card>
            </motion.div>

            {/* ── Contest config ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
              <Card className="glass p-6 space-y-5">
                <SectionHeader icon={Settings2} title="Configuration du concours" />

                {noGuild && (
                  <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-4 py-3 text-xs text-amber-300">
                    Aucun serveur configuré — connectez votre Discord dans l'onglet <strong>Intégration Discord</strong> pour accéder aux sélecteurs de salons et rôles.
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Titre du concours</Label>
                  <Input value={form.contest_title} onChange={e => setField('contest_title', e.target.value)} placeholder="Concours Screenshot" />
                  <p className="text-xs text-text-muted">Utilisé par le bot comme titre lors de l'ouverture.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Salon concours</Label>
                    {noGuild ? (
                      <Input disabled placeholder="Configurer un serveur d'abord" className="opacity-40" />
                    ) : (
                      <ChannelSelect
                        value={guildForm.contest_channel_id}
                        onChange={v => setGuildField('contest_channel_id', v)}
                        channels={channels}
                        loading={loadingChannels}
                        onRefresh={() => guildConfig && loadChannels(guildConfig.guild_id)}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Salon de logs</Label>
                    {noGuild ? (
                      <Input disabled placeholder="Configurer un serveur d'abord" className="opacity-40" />
                    ) : (
                      <ChannelSelect
                        value={guildForm.log_channel_id}
                        onChange={v => setGuildField('log_channel_id', v)}
                        channels={channels}
                        loading={loadingChannels}
                        onRefresh={() => guildConfig && loadChannels(guildConfig.guild_id)}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Rôle photographe de la semaine</Label>
                    {noGuild ? (
                      <Input disabled placeholder="Configurer un serveur d'abord" className="opacity-40" />
                    ) : (
                      <RoleSelect
                        value={guildForm.photographer_role_id}
                        onChange={v => setGuildField('photographer_role_id', v)}
                        roles={roles}
                        loading={loadingRoles}
                        onRefresh={() => guildConfig && loadRoles(guildConfig.guild_id)}
                      />
                    )}
                    <p className="text-xs text-text-muted">Attribué au gagnant par le bot.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Rôle admin</Label>
                    {noGuild ? (
                      <Input disabled placeholder="Configurer un serveur d'abord" className="opacity-40" />
                    ) : (
                      <RoleSelect
                        value={guildForm.admin_role_id}
                        onChange={v => setGuildField('admin_role_id', v)}
                        roles={roles}
                        loading={loadingRoles}
                        onRefresh={() => guildConfig && loadRoles(guildConfig.guild_id)}
                      />
                    )}
                    <p className="text-xs text-text-muted">Membres pouvant utiliser les commandes admin.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message d'annonce du concours</Label>
                  <Textarea
                    value={form.announcement_message}
                    onChange={e => setField('announcement_message', e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </Card>
            </motion.div>

            {/* ── Horaires ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={Clock} title="Horaires automatiques" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jour d&apos;ouverture</Label>
                    <select value={form.open_day} onChange={e => setField('open_day', e.target.value)} className="w-full appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50">
                      {SCHEDULE_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Heure d&apos;ouverture</Label>
                    <Input type="time" value={form.open_time} onChange={e => setField('open_time', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Jour de clôture</Label>
                    <select value={form.close_day} onChange={e => setField('close_day', e.target.value)} className="w-full appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50">
                      {SCHEDULE_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
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

            {/* ── Points ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={Trophy} title="Points" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>1ère place</Label>
                    <Input type="number" min={0} value={form.points_1st} onChange={e => setField('points_1st', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>2ème place</Label>
                    <Input type="number" min={0} value={form.points_2nd} onChange={e => setField('points_2nd', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>3ème place</Label>
                    <Input type="number" min={0} value={form.points_3rd} onChange={e => setField('points_3rd', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Participation</Label>
                    <Input type="number" min={0} value={form.participation_points} onChange={e => setField('participation_points', Number(e.target.value))} />
                    <p className="text-xs text-text-muted">Attribués à tous les participants.</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ── Rappels ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={Bell} title="Rappels" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jour du rappel</Label>
                    <select value={form.reminder_day} onChange={e => setField('reminder_day', Number(e.target.value))} className="w-full appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50">
                      {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Heure du rappel (0–23)</Label>
                    <Input type="number" min={0} max={23} value={form.reminder_hour} onChange={e => setField('reminder_hour', Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message personnalisé</Label>
                  <Textarea
                    value={form.reminder_message}
                    onChange={e => setField('reminder_message', e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Laissez vide pour utiliser le message par défaut du bot..."
                  />
                  <p className="text-xs text-text-muted">
                    Utilisez <span className="font-mono text-cyan">{'{timestamp}'}</span> pour insérer le compte à rebours Discord dynamique.
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* ── Clôture & Égalité ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={Clock} title="Clôture & Égalité" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Extension égalité (heures)</Label>
                    <Input type="number" min={1} value={form.tiebreak_duration_hours} onChange={e => setField('tiebreak_duration_hours', Number(e.target.value))} />
                    <p className="text-xs text-text-muted">Durée de la prolongation en cas d'égalité.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Alerte avant fermeture (minutes)</Label>
                    <Input type="number" min={0} value={form.warning_minutes} onChange={e => setField('warning_minutes', Number(e.target.value))} />
                    <p className="text-xs text-text-muted">0 pour désactiver l'alerte.</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ── Participation ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={ImageIcon} title="Participation" />
                <div className="space-y-2 max-w-xs">
                  <Label>Message promo tous les N participants</Label>
                  <Input type="number" min={1} value={form.promo_interval} onChange={e => setField('promo_interval', Number(e.target.value))} />
                  <p className="text-xs text-text-muted">Ex : 5 → un message promo s'envoie à chaque 5ème participation.</p>
                </div>
              </Card>
            </motion.div>

            {/* ── Options ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <Card className="glass p-6 space-y-4">
                <SectionHeader icon={Settings2} title="Options du bot" />
                {([
                  { key: 'is_active' as const,               label: 'Concours actif',               desc: 'Active la détection de screenshots et les votes dans le salon' },
                  { key: 'auto_mode_enabled' as const,        label: 'Ouverture automatique',         desc: 'Ouverture/clôture automatique selon les horaires configurés' },
                  { key: 'delete_invalid_messages' as const,  label: 'Supprimer messages invalides',  desc: 'Le bot supprime les messages sans image dans le salon concours' },
                  { key: 'delete_invalid_reactions' as const, label: 'Supprimer réactions invalides', desc: 'Le bot supprime les réactions autres que celle autorisée' },
                  { key: 'allow_text' as const,               label: 'Autoriser texte avec image',    desc: 'Messages texte accompagnant une image acceptés' },
                  { key: 'allow_videos' as const,             label: 'Autoriser vidéos',              desc: 'Vidéos acceptées comme participations au concours' },
                ] as { key: keyof typeof form; label: string; desc: string }[]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted">{desc}</p>
                    </div>
                    <Toggle checked={form[key] as boolean} onChange={v => setField(key, v as typeof form[typeof key])} />
                  </div>
                ))}
              </Card>
            </motion.div>

            {/* ── Save ── */}
            <Button className="gap-2 w-full sm:w-auto" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder les réglages'}
            </Button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
