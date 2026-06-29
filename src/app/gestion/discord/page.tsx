"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  RefreshCw, Unlink, Bot, Hash, Shield, Users,
  CheckCircle, XCircle, ExternalLink, Loader2, ChevronDown, ChevronRight,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/features/auth/hooks";
import {
  getGuildConfigs,
  upsertGuildConfig,
  fetchGuildChannels,
  fetchGuildRoles,
  checkBotPresence,
  syncDiscord,
} from "@/features/discord/api";
import { getEnvironments } from "@/features/environments/api";
import { supabase } from "@/lib/supabase/client";
import type { DiscordGuild, DiscordChannel, DiscordRole, DbDiscordGuildConfig } from "@/lib/supabase/types";

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
        disabled={loading || options.length === 0}
        className={`w-full appearance-none bg-surface-2 border border-border rounded-lg py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50 disabled:opacity-50 pr-8 ${Icon ? 'pl-8' : 'pl-3'}`}
      >
        <option value="">{loading ? 'Chargement...' : placeholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
    </div>
  );
}

function GuildIconFallback({ name }: { name: string }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-lg font-bold text-cyan flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface GuildSelectorProps {
  guilds: DiscordGuild[];
  selectedGuildId: string;
  onSelect: (guildId: string) => void;
}

function GuildSelector({ guilds, selectedGuildId, onSelect }: GuildSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {guilds.map(guild => {
        const iconUrl = guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`
          : null;
        const isSelected = guild.id === selectedGuildId;
        return (
          <button
            key={guild.id}
            onClick={() => onSelect(guild.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              isSelected
                ? 'bg-cyan/10 border-cyan/30 ring-1 ring-cyan/20'
                : 'border-border-subtle bg-surface-2 hover:border-border hover:bg-surface'
            }`}
          >
            {iconUrl ? (
              <Image src={iconUrl} alt={guild.name} width={40} height={40} className="rounded-lg flex-shrink-0" />
            ) : (
              <GuildIconFallback name={guild.name} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{guild.name}</p>
              {guild.approximate_member_count && (
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {guild.approximate_member_count.toLocaleString('fr-FR')} membres
                </p>
              )}
            </div>
            {isSelected ? (
              <CheckCircle className="w-4 h-4 text-cyan flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface GuildConfigPanelProps {
  guild: DiscordGuild;
  activeEnvId: string;
  existingConfig: DbDiscordGuildConfig | null;
  onSaved: () => void;
}

function GuildConfigPanel({ guild, activeEnvId, existingConfig, onSaved }: GuildConfigPanelProps) {
  const [botPresent, setBotPresent] = useState<boolean | null>(null);
  const [checkingBot, setCheckingBot] = useState(true);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(existingConfig?.contest_channel_id ?? '');
  const [selectedAdminRole, setSelectedAdminRole] = useState(existingConfig?.admin_role_id ?? '');
  const [selectedPhotographerRole, setSelectedPhotographerRole] = useState(existingConfig?.photographer_role_id ?? '');

  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`
    : null;

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands&guild_id=${guild.id}`;

  useEffect(() => {
    setSelectedChannel(existingConfig?.contest_channel_id ?? '');
    setSelectedAdminRole(existingConfig?.admin_role_id ?? '');
    setSelectedPhotographerRole(existingConfig?.photographer_role_id ?? '');
  }, [existingConfig]);

  useEffect(() => {
    setCheckingBot(true);
    checkBotPresence(guild.id).then(present => {
      setBotPresent(present);
      setCheckingBot(false);
      if (present) loadResources();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild.id]);

  async function loadResources(force = false) {
    if (channels.length > 0 && !force) return;
    setLoadingResources(true);
    try {
      const [ch, ro] = await Promise.all([fetchGuildChannels(guild.id), fetchGuildRoles(guild.id)]);
      setChannels(ch);
      setRoles(ro);
    } catch {
      toast.error("Impossible de récupérer les salons/rôles");
    } finally {
      setLoadingResources(false);
    }
  }

  async function handleSave() {
    if (!activeEnvId) return;
    setSaving(true);
    try {
      const channelName = channels.find(c => c.id === selectedChannel)?.name;
      const adminRoleName = roles.find(r => r.id === selectedAdminRole)?.name;
      const photographerRoleName = roles.find(r => r.id === selectedPhotographerRole)?.name;
      await upsertGuildConfig(activeEnvId, {
        guild_id: guild.id,
        guild_name: guild.name,
        guild_icon_url: iconUrl,
        guild_member_count: guild.approximate_member_count,
        contest_channel_id: selectedChannel || null,
        contest_channel_name: channelName ?? null,
        admin_role_id: selectedAdminRole || null,
        admin_role_name: adminRoleName ?? null,
        photographer_role_id: selectedPhotographerRole || null,
        photographer_role_name: photographerRoleName ?? null,
        bot_present: botPresent ?? false,
        last_sync: new Date().toISOString(),
      });
      toast.success("Configuration sauvegardée");
      onSaved();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass p-6 space-y-6">
      {/* Guild header */}
      <div className="flex items-center gap-4">
        {iconUrl ? (
          <Image src={iconUrl} alt={guild.name} width={48} height={48} className="rounded-xl flex-shrink-0" />
        ) : (
          <GuildIconFallback name={guild.name} />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">{guild.name}</h3>
          {guild.approximate_member_count && (
            <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" />
              {guild.approximate_member_count.toLocaleString('fr-FR')} membres
            </p>
          )}
        </div>
        {/* Bot status */}
        <div className="flex items-center gap-2">
          {checkingBot ? (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Vérification...
            </span>
          ) : botPresent ? (
            <span className="text-xs font-medium text-green-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Bot installé
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-red-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Bot absent
              </span>
              <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-red-400/30 text-red-400 hover:text-red-300">
                  <Bot className="w-3 h-3" /> Inviter <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                setCheckingBot(true);
                checkBotPresence(guild.id).then(p => { setBotPresent(p); setCheckingBot(false); if (p) loadResources(); });
              }}>
                <RefreshCw className="w-3 h-3" /> Vérifier
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Config form — only when bot is present */}
      {botPresent === false && !checkingBot && (
        <p className="text-xs text-text-muted text-center py-2">
          Invitez le bot sur ce serveur pour configurer les salons et rôles.
        </p>
      )}

      {botPresent && (
        <div className="space-y-5">
          {loadingResources ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Salon concours
                  </label>
                  <DiscordSelect
                    value={selectedChannel}
                    onChange={setSelectedChannel}
                    options={channels.map(c => ({ id: c.id, name: `#${c.name}` }))}
                    placeholder="Sélectionner un salon..."
                    icon={Hash}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Rôle administrateur
                  </label>
                  <DiscordSelect
                    value={selectedAdminRole}
                    onChange={setSelectedAdminRole}
                    options={roles.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="Sélectionner un rôle..."
                    icon={Shield}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Rôle photographe de la semaine
                  </label>
                  <DiscordSelect
                    value={selectedPhotographerRole}
                    onChange={setSelectedPhotographerRole}
                    options={roles.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="Sélectionner un rôle..."
                    icon={Shield}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => loadResources(true)}
                  className="text-xs text-text-muted hover:text-cyan transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Actualiser les salons/rôles
                </button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Sauvegarder
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function DiscordPageContent() {
  const searchParams = useSearchParams();
  const { user, profile, loading: userLoading } = useUser();
  const [activeEnvId, setActiveEnvId] = useState('');
  const [guildConfigs, setGuildConfigs] = useState<DbDiscordGuildConfig[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isDiscordConnected = !!profile?.discord_id;
  const guilds: DiscordGuild[] = (profile?.discord_guilds as DiscordGuild[]) ?? [];
  const selectedGuild = guilds.find(g => g.id === selectedGuildId) ?? null;
  const existingConfig = guildConfigs.find(c => c.guild_id === selectedGuildId) ?? null;

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) toast.success('Compte Discord connecté avec succès !');
    if (error === 'oauth_failed') {
      const reason = searchParams.get('reason');
      toast.error(`Échec de la connexion Discord${reason ? ': ' + reason : ''}`);
    }
  }, [searchParams]);

  useEffect(() => {
    getEnvironments().then(envs => {
      const active = envs.find(e => e.is_active) ?? envs[0];
      if (active) setActiveEnvId(active.id);
    });
  }, []);

  const loadGuildConfigs = useCallback(async () => {
    if (!activeEnvId) return;
    const configs = await getGuildConfigs(activeEnvId);
    setGuildConfigs(configs);
    // Auto-select first configured guild, or first guild
    if (!selectedGuildId) {
      const configured = guilds.find(g => configs.some(c => c.guild_id === g.id));
      setSelectedGuildId(configured?.id ?? guilds[0]?.id ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnvId, guilds.length]);

  useEffect(() => {
    if (activeEnvId) loadGuildConfigs();
  }, [activeEnvId, loadGuildConfigs]);

  // Auto-select first guild when guilds load
  useEffect(() => {
    if (guilds.length > 0 && !selectedGuildId) {
      const configured = guilds.find(g => guildConfigs.some(c => c.guild_id === g.id));
      setSelectedGuildId(configured?.id ?? guilds[0].id);
    }
  }, [guilds, guildConfigs, selectedGuildId]);

  async function handleSync() {
    setSyncing(true);
    try {
      await syncDiscord();
      toast.success('Discord synchronisé');
      window.location.reload();
    } catch {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!supabase || !user) return;
    setDisconnecting(true);
    try {
      await supabase.from('user_profiles').update({
        discord_id: null,
        discord_username: null,
        discord_display_name: null,
        discord_avatar_url: null,
        discord_access_token: null,
        discord_refresh_token: null,
        discord_token_expires_at: null,
        discord_guilds: null,
        discord_last_sync: null,
      }).eq('id', user.id);
      toast.success('Discord déconnecté');
      window.location.reload();
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <AdminLayout title="Intégration Discord">
      <div className="max-w-3xl space-y-8">

        {/* Connection card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6">
            <div className="flex items-center gap-4">
              {isDiscordConnected && profile?.discord_avatar_url ? (
                <Image
                  src={profile.discord_avatar_url}
                  alt={profile.discord_display_name ?? ''}
                  width={52} height={52}
                  className="rounded-full border-2 border-cyan/30 flex-shrink-0"
                />
              ) : (
                <div className="w-13 h-13 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                  <Bot className="w-6 h-6 text-text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-text-primary">
                    {isDiscordConnected ? 'Compte Discord connecté' : 'Discord non connecté'}
                  </h2>
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isDiscordConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                {isDiscordConnected ? (
                  <p className="text-sm text-text-muted">
                    {profile.discord_display_name ?? profile.discord_username}
                    {profile.discord_username && ` · @${profile.discord_username}`}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">Connectez votre compte pour accéder à vos serveurs</p>
                )}
                {profile?.discord_last_sync && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Sync : {new Date(profile.discord_last_sync).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isDiscordConnected ? (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
                      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Synchroniser
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={disconnecting} className="gap-1.5 border-red-500/30 text-red-400 hover:text-red-300">
                      <Unlink className="w-3.5 h-3.5" />
                      Déconnecter
                    </Button>
                  </>
                ) : (
                  <a href="/api/auth/discord">
                    <Button size="sm" className="gap-1.5">
                      <Bot className="w-3.5 h-3.5" /> Connecter Discord
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Not connected empty state */}
        {!isDiscordConnected && !userLoading && (
          <Card className="glass p-10 text-center space-y-4">
            <Bot className="w-12 h-12 text-text-muted mx-auto" />
            <div>
              <h3 className="font-semibold text-text-primary mb-1">Connexion Discord requise</h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto">
                Connectez votre compte Discord pour voir vos serveurs et configurer le bot.
              </p>
            </div>
            <a href="/api/auth/discord">
              <Button className="gap-2"><Bot className="w-4 h-4" /> Connecter mon compte Discord</Button>
            </a>
          </Card>
        )}

        {/* Guild selection */}
        {isDiscordConnected && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
            <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">
              Sélectionner un serveur ({guilds.length})
            </h2>
            {userLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : guilds.length === 0 ? (
              <Card className="glass p-8 text-center">
                <Bot className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">Aucun serveur trouvé où vous êtes propriétaire ou administrateur.</p>
                <Button size="sm" variant="outline" onClick={handleSync} className="mt-4 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Synchroniser
                </Button>
              </Card>
            ) : (
              <GuildSelector
                guilds={guilds}
                selectedGuildId={selectedGuildId}
                onSelect={setSelectedGuildId}
              />
            )}
          </motion.div>
        )}

        {/* Config panel for selected guild */}
        {isDiscordConnected && selectedGuild && (
          <motion.div
            key={selectedGuild.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-3"
          >
            <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Configuration — {selectedGuild.name}</h2>
            <GuildConfigPanel
              guild={selectedGuild}
              activeEnvId={activeEnvId}
              existingConfig={existingConfig}
              onSaved={loadGuildConfigs}
            />
          </motion.div>
        )}

      </div>
    </AdminLayout>
  );
}

export default function DiscordPage() {
  return <Suspense><DiscordPageContent /></Suspense>;
}
