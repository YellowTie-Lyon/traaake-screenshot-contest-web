"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Save, Loader2, KeyRound, Eye, EyeOff, Hash, Shield, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getEnvironments, getEnvironmentWithSettings, saveBotCredentials } from "@/features/environments/api";
import { getGuildConfigs, fetchGuildChannels, fetchGuildRoles, upsertGuildConfig } from "@/features/discord/api";
import { upsertSettings } from "@/features/settings/api";
import type { DbContestSettings, DbEnvironment, DbDiscordGuildConfig, DiscordChannel, DiscordRole } from "@/lib/supabase/types";

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
  contest_title: '',
  photographer_role_id: '',
  announcement_message: '📸 Le concours screenshot est ouvert ! Postez vos plus belles captures dans ce salon.',
  points_1st: 100,
  points_2nd: 75,
  points_3rd: 50,
  is_active: false,
  open_day: 'wednesday',
  open_time: '18:00',
  close_day: 'wednesday',
  close_time: '20:00',
  timezone: 'Europe/Paris',
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
      {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
    </select>
  );
}

function DiscordSelect({
  value, onChange, options, placeholder, loading, icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  loading?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
        className={`w-full appearance-none bg-surface-2 border border-border rounded-lg py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50 disabled:opacity-50 ${Icon ? 'pl-8 pr-3' : 'px-3'}`}
      >
        <option value="">{loading ? 'Chargement...' : placeholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

export default function ReglagesPage() {
  const [activeEnv, setActiveEnv] = useState<DbEnvironment | null>(null);
  const [guildConfig, setGuildConfig] = useState<DbDiscordGuildConfig | null>(null);
  const [settings, setSettings] = useState<DbContestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBot, setSavingBot] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  // Bot credentials
  const [botToken, setBotToken] = useState('');
  const [appId, setAppId] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Discord selectors
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('');

  useEffect(() => {
    setLoading(true);
    getEnvironments().then(async envs => {
      const env = envs.find(e => e.is_active) ?? envs[0] ?? null;
      setActiveEnv(env);
      if (!env) return;
      setAppId(env.discord_app_id ?? '');

      const [settingsData, configs] = await Promise.all([
        getEnvironmentWithSettings(env.name),
        getGuildConfigs(env.id),
      ]);

      const guild = configs[0] ?? null;
      setGuildConfig(guild);
      setSelectedChannel(guild?.contest_channel_id ?? '');

      if (settingsData?.settings) {
        setSettings(settingsData.settings);
        const s = settingsData.settings;
        setForm({
          contest_title: s.contest_title ?? '',
          photographer_role_id: s.photographer_role_id ?? '',
          announcement_message: s.announcement_message ?? DEFAULT_FORM.announcement_message,
          points_1st: s.points_1st ?? 100,
          points_2nd: s.points_2nd ?? 75,
          points_3rd: s.points_3rd ?? 50,
          is_active: s.is_active ?? false,
          open_day: s.open_day,
          open_time: s.open_time,
          close_day: s.close_day,
          close_time: s.close_time,
          timezone: s.timezone,
          auto_mode_enabled: s.auto_mode_enabled,
          delete_invalid_messages: s.delete_invalid_messages,
          delete_invalid_reactions: s.delete_invalid_reactions,
          allow_text: s.allow_text,
          allow_video: s.allow_video,
        });
      }

      // Load channels & roles if guild is configured
      if (guild?.guild_id) loadDiscordResources(guild.guild_id);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDiscordResources(guildId: string, force = false) {
    if ((channels.length > 0 && !force) || !guildId) return;
    setLoadingResources(true);
    try {
      const [ch, ro] = await Promise.all([fetchGuildChannels(guildId), fetchGuildRoles(guildId)]);
      setChannels(ch);
      setRoles(ro);
    } catch {
      toast.error("Impossible de charger les salons/rôles depuis Discord");
    } finally {
      setLoadingResources(false);
    }
  }

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
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
      // Save contest settings
      await upsertSettings(activeEnv.id, {
        ...form,
        // Keep legacy fields from existing settings
        guild_id: guildConfig?.guild_id ?? settings?.guild_id ?? '',
        contest_channel_id: selectedChannel || (settings?.contest_channel_id ?? ''),
        admin_role_id: guildConfig?.admin_role_id ?? settings?.admin_role_id ?? '',
        allowed_reaction: settings?.allowed_reaction ?? '❤️',
      });

      // Save selected channel back to guild config
      if (guildConfig && selectedChannel !== guildConfig.contest_channel_id) {
        const channelName = channels.find(c => c.id === selectedChannel)?.name;
        await upsertGuildConfig(activeEnv.id, {
          ...guildConfig,
          contest_channel_id: selectedChannel || null,
          contest_channel_name: channelName ?? null,
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
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Bot credentials */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" /> Identifiants du bot Discord
                </h2>
                <p className="text-xs text-text-muted">
                  Le token n'est jamais affiché après sauvegarde pour des raisons de sécurité.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Application ID</Label>
                    <Input
                      value={appId}
                      onChange={e => setAppId(e.target.value)}
                      placeholder="1234567890123456789"
                      className="font-mono text-xs"
                    />
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
                      <button
                        type="button"
                        onClick={() => setShowToken(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
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

            {/* Contest config */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Configuration du concours</h2>

                {noGuild && (
                  <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-4 py-3 text-xs text-amber-300">
                    Aucun serveur configuré — connectez votre Discord et configurez un serveur dans l'onglet <strong>Intégration Discord</strong> pour accéder aux sélecteurs de salons et rôles.
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Titre du concours</Label>
                  <Input
                    value={form.contest_title}
                    onChange={e => setField('contest_title', e.target.value)}
                    placeholder="Concours Screenshot"
                  />
                  <p className="text-xs text-text-muted">Utilisé par le bot comme titre lors de l'ouverture du concours.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Salon concours</Label>
                      {guildConfig?.guild_id && (
                        <button
                          onClick={() => loadDiscordResources(guildConfig.guild_id, true)}
                          className="text-[10px] text-text-muted hover:text-cyan flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Actualiser
                        </button>
                      )}
                    </div>
                    {noGuild ? (
                      <Input disabled placeholder="Configurer un serveur d'abord" className="opacity-40" />
                    ) : (
                      <DiscordSelect
                        value={selectedChannel}
                        onChange={setSelectedChannel}
                        options={channels.map(c => ({ id: c.id, name: `#${c.name}` }))}
                        placeholder="Sélectionner un salon..."
                        loading={loadingResources}
                        icon={Hash}
                      />
                    )}
                    <p className="text-xs text-text-muted">Depuis : {guildConfig?.guild_name ?? '—'}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Rôle photographe de la semaine</Label>
                    {noGuild ? (
                      <Input disabled placeholder="Configurer un serveur d'abord" className="opacity-40" />
                    ) : (
                      <DiscordSelect
                        value={form.photographer_role_id}
                        onChange={v => setField('photographer_role_id', v)}
                        options={roles.map(r => ({ id: r.id, name: r.name }))}
                        placeholder="Sélectionner un rôle..."
                        loading={loadingResources}
                        icon={Shield}
                      />
                    )}
                    <p className="text-xs text-text-muted">Attribué au gagnant par le bot.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message d'annonce du concours</Label>
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Points</h2>
                <div className="grid grid-cols-3 gap-4">
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
                </div>
              </Card>
            </motion.div>

            {/* Options */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Options du bot</h2>
                {([
                  { key: 'is_active' as const, label: 'Concours actif', desc: 'Active la détection de screenshots et les votes dans le salon' },
                  { key: 'auto_mode_enabled' as const, label: 'Ouverture automatique', desc: 'Ouverture/clôture automatique selon les horaires configurés' },
                  { key: 'delete_invalid_messages' as const, label: 'Supprimer messages invalides', desc: 'Le bot supprime les messages sans image dans le salon concours' },
                  { key: 'delete_invalid_reactions' as const, label: 'Supprimer réactions invalides', desc: 'Le bot supprime les réactions autres que celle autorisée' },
                  { key: 'allow_text' as const, label: 'Autoriser texte', desc: 'Messages texte acceptés en plus des images' },
                  { key: 'allow_video' as const, label: 'Autoriser vidéos', desc: 'Vidéos acceptées comme participations' },
                ] as { key: keyof typeof form; label: string; desc: string }[]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted">{desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={form[key] as boolean}
                      onClick={() => setField(key, !form[key] as typeof form[typeof key])}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${form[key] ? 'bg-cyan' : 'bg-surface-2 border border-border'}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </Card>
            </motion.div>

            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder les réglages'}
            </Button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
