"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Server, CheckCircle2, XCircle, Loader2, Bot, Eye, EyeOff, Save } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SupabaseBanner } from "@/components/admin/SupabaseBanner";
import { EnvironmentBadge } from "@/components/admin/EnvironmentBadge";
import { getEnvironmentWithSettings, setActiveEnvironment, saveBotCredentials } from "@/features/environments/api";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import type { DbEnvironment, DbContestSettings, EnvironmentName } from "@/lib/supabase/types";

type EnvWithSettings = {
  environment: DbEnvironment;
  settings: DbContestSettings | null;
};

function SettingRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display = value === null || value === undefined || value === '' ? (
    <span className="text-text-muted italic text-xs">Non configuré</span>
  ) : typeof value === 'boolean' ? (
    value
      ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Activé</span>
      : <span className="text-text-muted flex items-center gap-1"><XCircle className="w-3 h-3" /> Désactivé</span>
  ) : (
    <span className="font-mono text-xs text-text-primary truncate max-w-[180px]">{String(value)}</span>
  );

  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle/50 last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      {display}
    </div>
  );
}

function isEnvReady(settings: DbContestSettings | null): boolean {
  if (!settings) return false;
  return !!(settings.guild_id && settings.contest_channel_id && settings.photographer_role_id);
}

function BotCredentialsForm({ envId, appId }: { envId: string; appId: string | null }) {
  const [token, setToken] = useState('');
  const [clientId, setClientId] = useState(appId ?? '');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token && !clientId) return;
    setSaving(true);
    try {
      await saveBotCredentials(envId, token, clientId);
      toast.success('Credentials du bot sauvegardés');
      setToken('');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle/50 space-y-3">
      <p className="text-xs text-text-muted flex items-center gap-1.5">
        <Bot className="w-3.5 h-3.5 text-cyan" />
        Credentials Discord Bot (stockés chiffrés, jamais exposés au navigateur)
      </p>
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Application ID (Client ID)</Label>
          <Input
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="123456789012345678"
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Bot Token</Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Laissez vide pour ne pas modifier"
              className="h-8 text-xs font-mono pr-8"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2 h-8 text-xs"
          disabled={saving || (!token && !clientId)}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}

export default function EnvironnementsPage() {
  const [envData, setEnvData] = useState<EnvWithSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    Promise.all([
      getEnvironmentWithSettings('test'),
      getEnvironmentWithSettings('production'),
    ]).then(results => {
      setEnvData(results.filter(Boolean) as EnvWithSettings[]);
    }).catch(() => {
      toast.error("Erreur lors du chargement des environnements");
    }).finally(() => setLoading(false));
  }, [configured]);

  async function handleActivate(id: string, label: string) {
    setActivating(id);
    try {
      await setActiveEnvironment(id);
      setEnvData(prev => prev.map(e => ({
        ...e,
        environment: { ...e.environment, is_active: e.environment.id === id }
      })));
      toast.success(`Environnement "${label}" activé — le bot Discord bascule automatiquement`);
    } catch {
      toast.error("Erreur lors de l'activation");
    } finally {
      setActivating(null);
    }
  }

  return (
    <AdminLayout title="Environnements">
      <div className="max-w-5xl space-y-6">
        {!configured && <SupabaseBanner />}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-text-secondary text-sm">
            Activez un environnement pour y connecter le bot Discord. Le bot détecte le changement en temps réel via Supabase — aucun redémarrage nécessaire.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map(i => <Skeleton key={i} className="h-96 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configured && envData.length > 0 ? envData.map(({ environment: env, settings }, idx) => {
              const ready = isEnvReady(settings);
              return (
                <motion.div
                  key={env.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`glass h-full ${env.is_active ? 'border-cyan/30' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Server className="w-4 h-4 text-cyan" />
                          {env.label}
                          <EnvironmentBadge env={env.name as EnvironmentName} />
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {ready ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Prêt
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Incomplet
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <SettingRow label="Guild ID" value={settings?.guild_id} />
                      <SettingRow label="Salon concours" value={settings?.contest_channel_id} />
                      <SettingRow label="Rôle admin" value={settings?.admin_role_id} />
                      <SettingRow label="Rôle photographe" value={settings?.photographer_role_id} />
                      <SettingRow label="Mode automatique" value={settings?.auto_mode_enabled} />
                      <SettingRow label="Ouverture" value={settings ? `${settings.open_day} à ${settings.open_time}` : null} />
                      <SettingRow label="Clôture" value={settings ? `${settings.close_day} à ${settings.close_time}` : null} />
                      <SettingRow label="Points participation" value={settings?.participation_points} />
                      <SettingRow label="Points Top 3" value={settings?.top_3_points} />
                      <SettingRow label="Points gagnant" value={settings?.winner_points} />
                      <SettingRow label="App ID Discord" value={env.discord_app_id} />
                      <SettingRow label="Bot Token" value={env.discord_bot_token ? '••••••••••••••••' : null} />

                      <BotCredentialsForm envId={env.id} appId={env.discord_app_id} />

                      <div className="pt-3">
                        {env.is_active ? (
                          <Badge variant="open" className="w-full justify-center py-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse mr-1.5" />
                            Bot connecté — environnement actif
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            disabled={!!activating}
                            onClick={() => handleActivate(env.id, env.label)}
                          >
                            {activating === env.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            Activer cet environnement
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }) : (
              ['Test', 'Production'].map((label, idx) => (
                <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <Card className="glass h-full opacity-50">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="w-4 h-4 text-cyan" />{label}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-text-muted">Connectez Supabase pour voir les données.</p></CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
