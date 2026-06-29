"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  RefreshCw,
  Unlink,
  Bot,
  Hash,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
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

function GuildIconFallback({ name }: { name: string }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-lg font-bold text-cyan flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function DiscordSelect({
  value,
  onChange,
  options,
  placeholder,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  loading?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
        className="w-full appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50 pr-8 disabled:opacity-50"
      >
        <option value="">{loading ? "Chargement..." : placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
    </div>
  );
}

interface GuildCardProps {
  guild: DiscordGuild;
  activeEnvId: string;
  existingConfigs: DbDiscordGuildConfig[];
  onSaved: () => void;
}

function GuildCard({ guild, activeEnvId, existingConfigs, onSaved }: GuildCardProps) {
  const [botPresent, setBotPresent] = useState<boolean | null>(null);
  const [checkingBot, setCheckingBot] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState(existingConfigs[0]?.contest_channel_id ?? "");
  const [selectedAdminRole, setSelectedAdminRole] = useState(existingConfigs[0]?.admin_role_id ?? "");
  const [selectedPhotographerRole, setSelectedPhotographerRole] = useState(existingConfigs[0]?.photographer_role_id ?? "");

  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`
    : null;

  async function refreshBotPresence() {
    setCheckingBot(true);
    const present = await checkBotPresence(guild.id);
    setBotPresent(present);
    setCheckingBot(false);
    // Auto-load resources when bot just detected
    if (present && channels.length === 0) {
      await loadResources(true);
      setExpanded(true);
    }
  }

  useEffect(() => {
    refreshBotPresence();
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
      toast.error("Impossible de récupérer les salons/rôles.");
    } finally {
      setLoadingResources(false);
    }
  }

  async function handleExpand() {
    if (!expanded && botPresent) await loadResources();
    setExpanded(v => !v);
  }

  async function handleSave() {
    if (!activeEnvId) { toast.error("Aucun environnement actif"); return; }
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
      toast.success(`Configuration de ${guild.name} sauvegardée`);
      onSaved();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands&guild_id=${guild.id}`;

  return (
    <Card className="glass border-border overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {iconUrl ? (
            <Image src={iconUrl} alt={guild.name} width={48} height={48} className="rounded-xl flex-shrink-0" />
          ) : (
            <GuildIconFallback name={guild.name} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary truncate">{guild.name}</h3>
              {guild.owner && (
                <span className="text-xs border border-amber-500/30 bg-amber-900/20 text-amber-400 px-2 py-0.5 rounded-full">Propriétaire</span>
              )}
            </div>
            {guild.approximate_member_count && (
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {guild.approximate_member_count.toLocaleString("fr-FR")} membres
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {/* Bot status */}
            {botPresent === null || checkingBot ? (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" /> Vérification...
              </span>
            ) : botPresent ? (
              <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                <CheckCircle className="w-4 h-4" />
                Bot installé
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                  <XCircle className="w-4 h-4" />
                  Bot absent
                </div>
                <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-red-400/30 text-red-400 hover:text-red-300">
                    <Bot className="w-3 h-3" />
                    Inviter le bot
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            )}

            {/* Re-check button — shown after invite */}
            {botPresent === false && (
              <Button size="sm" variant="outline" onClick={refreshBotPresence} disabled={checkingBot} className="h-7 gap-1 text-xs">
                <RefreshCw className="w-3 h-3" />
                Re-vérifier
              </Button>
            )}

            {/* Configure button — only when bot is present */}
            {botPresent && (
              <Button size="sm" variant="outline" onClick={handleExpand} className="h-8 gap-1.5">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                Configurer
              </Button>
            )}
          </div>
        </div>
      </div>

      {expanded && botPresent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border px-5 pb-5 pt-4 space-y-4"
        >
          {loadingResources ? (
            <div className="space-y-2">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
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
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Rôle photographe
                  </label>
                  <DiscordSelect
                    value={selectedPhotographerRole}
                    onChange={setSelectedPhotographerRole}
                    options={roles.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="Sélectionner un rôle..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => loadResources(true)}
                  className="text-xs text-text-muted hover:text-cyan transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Actualiser les salons/rôles
                </button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Sauvegarder
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </Card>
  );
}

function DiscordPageContent() {
  const searchParams = useSearchParams();
  const { user, profile, loading: userLoading } = useUser();
  const [activeEnvId, setActiveEnvId] = useState<string>('');
  const [guildConfigs, setGuildConfigs] = useState<DbDiscordGuildConfig[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isDiscordConnected = !!profile?.discord_id;
  const guilds: DiscordGuild[] = (profile?.discord_guilds as DiscordGuild[]) ?? [];

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.success("Compte Discord connecté avec succès !");
    if (error === "oauth_failed") { const reason = searchParams.get("reason"); toast.error(`Échec de la connexion Discord${reason ? ": " + reason : ""}`); }
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
  }, [activeEnvId]);

  useEffect(() => {
    if (activeEnvId) loadGuildConfigs();
  }, [activeEnvId, loadGuildConfigs]);

  async function handleSync() {
    setSyncing(true);
    try {
      await syncDiscord();
      toast.success("Discord synchronisé");
      window.location.reload();
    } catch {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!supabase || !user) return;
    setDisconnecting(true);
    try {
      await supabase.from("user_profiles").update({
        discord_id: null,
        discord_username: null,
        discord_display_name: null,
        discord_avatar_url: null,
        discord_access_token: null,
        discord_refresh_token: null,
        discord_token_expires_at: null,
        discord_guilds: null,
        discord_last_sync: null,
      }).eq("id", user.id);
      toast.success("Discord déconnecté");
      window.location.reload();
    } catch {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <AdminLayout title="Intégration Discord">
      <div className="max-w-4xl space-y-8">

        {/* Connection status */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {isDiscordConnected && profile?.discord_avatar_url ? (
                  <Image
                    src={profile.discord_avatar_url}
                    alt={profile.discord_display_name ?? ""}
                    width={52}
                    height={52}
                    className="rounded-full border-2 border-cyan/30"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                    <Bot className="w-6 h-6 text-text-muted" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-text-primary">
                      {isDiscordConnected ? "Discord connecté" : "Discord non connecté"}
                    </h2>
                    <span className={`h-2 w-2 rounded-full ${isDiscordConnected ? "bg-green-400" : "bg-red-400"}`} />
                  </div>
                  {isDiscordConnected ? (
                    <p className="text-sm text-text-muted">
                      {profile.discord_display_name ?? profile.discord_username}
                      {profile.discord_username && ` · @${profile.discord_username}`}
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">
                      Connectez votre compte Discord pour gérer vos serveurs
                    </p>
                  )}
                  {profile?.discord_last_sync && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Dernière sync : {new Date(profile.discord_last_sync).toLocaleString("fr-FR")}
                    </p>
                  )}
                </div>
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
                      <Bot className="w-3.5 h-3.5" />
                      Connecter mon compte Discord
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats */}
        {isDiscordConnected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { label: "Serveurs détectés", value: guilds.length, icon: Users },
              { label: "Configurés", value: guildConfigs.length, icon: CheckCircle },
              { label: "Salons total", value: guildConfigs.filter(c => c.contest_channel_id).length, icon: Hash },
              { label: "Bot installé", value: guildConfigs.filter(c => c.bot_present).length, icon: Bot },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="glass border-border p-4 text-center">
                <Icon className="w-5 h-5 text-cyan mx-auto mb-1" />
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Guild list */}
        {isDiscordConnected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">
                Serveurs ({guilds.length})
              </h2>
            </div>

            {userLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : guilds.length === 0 ? (
              <Card className="glass border-border p-8 text-center">
                <Bot className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">Aucun serveur trouvé où vous êtes propriétaire ou administrateur.</p>
                <Button size="sm" variant="outline" onClick={handleSync} className="mt-4">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Synchroniser
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {guilds.map((guild, i) => (
                  <motion.div
                    key={guild.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <GuildCard
                      guild={guild}
                      activeEnvId={activeEnvId}
                      existingConfigs={guildConfigs.filter(c => c.guild_id === guild.id)}
                      onSaved={loadGuildConfigs}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!isDiscordConnected && !userLoading && (
          <Card className="glass border-border p-10 text-center space-y-4">
            <Bot className="w-12 h-12 text-text-muted mx-auto" />
            <div>
              <h3 className="font-semibold text-text-primary mb-1">Connexion Discord requise</h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto">
                Connectez votre compte Discord pour voir vos serveurs, configurer les salons et rôles, et vérifier la présence du bot.
              </p>
            </div>
            <a href="/api/auth/discord">
              <Button className="gap-2">
                <Bot className="w-4 h-4" />
                Connecter mon compte Discord
              </Button>
            </a>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

import { Suspense } from "react";
export default function DiscordPage() {
  return <Suspense><DiscordPageContent /></Suspense>;
}
