"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { UserPlus, Trash2, Copy, Check, Loader2, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/features/auth/hooks";
import { ALL_TABS, type TabSlug, type UserRole } from "@/lib/supabase/types";

interface UserEntry {
  id: string;
  email: string | undefined;
  last_sign_in_at: string | undefined;
  created_at: string;
  profile: {
    role: UserRole;
    display_name: string | null;
    allowed_tabs: TabSlug[];
  } | null;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "moderator", label: "Modérateur" },
  { value: "administrator", label: "Administrateur" },
  { value: "viewer", label: "Observateur" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Propriétaire",
  administrator: "Administrateur",
  moderator: "Modérateur",
  viewer: "Observateur",
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  administrator: "text-cyan bg-cyan/10 border-cyan/20",
  moderator: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  viewer: "text-text-muted bg-surface-2 border-border",
};

function TabPermissions({ tabs, onChange, disabled }: {
  tabs: TabSlug[];
  onChange: (tabs: TabSlug[]) => void;
  disabled: boolean;
}) {
  function toggle(slug: TabSlug) {
    if (tabs.includes(slug)) onChange(tabs.filter(t => t !== slug));
    else onChange([...tabs, slug]);
  }
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {ALL_TABS.map(({ slug, label }) => (
        <button
          key={slug}
          onClick={() => !disabled && toggle(slug)}
          disabled={disabled}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
            tabs.includes(slug)
              ? "bg-cyan/10 border-cyan/30 text-cyan"
              : "bg-surface-2 border-border text-text-muted hover:border-border-subtle"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function UtilisateursPage() {
  const { profile: myProfile } = useUser();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingTabs, setPendingTabs] = useState<Record<string, TabSlug[]>>({});
  const [pendingRole, setPendingRole] = useState<Record<string, UserRole>>({});

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("moderator");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteTabs, setInviteTabs] = useState<TabSlug[]>([]);
  const [inviting, setInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = myProfile?.role === "owner";

  useEffect(() => {
    if (!isOwner) { setLoading(false); return; }
    loadUsers();
  }, [isOwner]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/invite");
      const { users: data, error } = await res.json();
      if (error) throw new Error(error);
      setUsers(data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setGeneratedLink(null);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          display_name: inviteDisplayName.trim() || undefined,
          allowed_tabs: inviteTabs,
        }),
      });
      const { link, error } = await res.json();
      if (error) throw new Error(error);
      setGeneratedLink(link);
      setInviteEmail("");
      setInviteDisplayName("");
      setInviteTabs([]);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'invitation");
    } finally {
      setInviting(false);
    }
  }

  async function handleSave(userId: string) {
    setSaving(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: pendingRole[userId],
          allowed_tabs: pendingTabs[userId],
        }),
      });
      const { error } = await res.json();
      if (error) throw new Error(error);
      toast.success("Permissions mises à jour");
      await loadUsers();
      setExpandedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(userId: string, email?: string) {
    if (!confirm(`Révoquer l'accès de ${email ?? userId} ?`)) return;
    setDeleting(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const { error } = await res.json();
      if (error) throw new Error(error);
      toast.success("Accès révoqué");
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(null);
    }
  }

  function toggleExpand(userId: string, user: UserEntry) {
    if (expandedId === userId) { setExpandedId(null); return; }
    setExpandedId(userId);
    setPendingTabs(prev => ({ ...prev, [userId]: user.profile?.allowed_tabs ?? [] }));
    setPendingRole(prev => ({ ...prev, [userId]: user.profile?.role ?? "moderator" }));
  }

  async function copyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOwner) {
    return (
      <AdminLayout title="Utilisateurs">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Shield className="w-10 h-10 text-text-muted" />
          <p className="text-text-muted">Accès réservé au propriétaire.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Utilisateurs">
      <div className="max-w-3xl space-y-8">

        {/* Invite form */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 space-y-5">
            <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> Inviter un utilisateur
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="modérateur@exemple.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Nom affiché</Label>
                <Input value={inviteDisplayName} onChange={e => setInviteDisplayName(e.target.value)} placeholder="Pseudo (optionnel)" />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50"
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Onglets autorisés</Label>
              <TabPermissions tabs={inviteTabs} onChange={setInviteTabs} disabled={false} />
            </div>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {inviting ? "Génération..." : "Générer le lien d'invitation"}
            </Button>

            {generatedLink && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-surface-2 border border-cyan/20 p-4 space-y-2">
                <p className="text-xs text-cyan font-medium">Lien d'invitation généré — partagez-le avec l'utilisateur :</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-text-secondary bg-surface rounded p-2 overflow-x-auto break-all">{generatedLink}</code>
                  <button onClick={copyLink} className="flex-shrink-0 p-2 rounded hover:bg-surface transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-text-muted" />}
                  </button>
                </div>
                <p className="text-xs text-text-muted">Ce lien est à usage unique et expire après 24h.</p>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Users list */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass p-6 space-y-4">
            <h2 className="text-xs font-semibold text-cyan uppercase tracking-widest">Comptes ({users.length})</h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-text-muted">Aucun utilisateur.</p>
            ) : (
              <div className="space-y-2">
                {users.map(user => {
                  const isMe = myProfile?.id === user.id;
                  const isExpanded = expandedId === user.id;
                  const role = user.profile?.role ?? "viewer";
                  const name = user.profile?.display_name ?? user.email ?? user.id;

                  return (
                    <div key={user.id} className="rounded-lg border border-border-subtle overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-surface-2">
                        <div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-cyan">{name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                          <p className="text-xs text-text-muted truncate">{user.email}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${ROLE_COLORS[role]}`}>
                          {ROLE_LABELS[role]}
                        </span>
                        {!isMe && role !== "owner" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleExpand(user.id, user)}
                              className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.email)}
                              disabled={deleting === user.id}
                              className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                            >
                              {deleting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                        {isMe && <span className="text-xs text-text-muted">(vous)</span>}
                      </div>

                      {isExpanded && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-4 border-t border-border-subtle space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Rôle</Label>
                            <select
                              value={pendingRole[user.id] ?? role}
                              onChange={e => setPendingRole(prev => ({ ...prev, [user.id]: e.target.value as UserRole }))}
                              className="w-48 appearance-none bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan/50"
                            >
                              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Onglets autorisés</Label>
                            <TabPermissions
                              tabs={pendingTabs[user.id] ?? []}
                              onChange={tabs => setPendingTabs(prev => ({ ...prev, [user.id]: tabs }))}
                              disabled={saving === user.id}
                            />
                          </div>
                          <Button size="sm" onClick={() => handleSave(user.id)} disabled={saving === user.id} className="gap-2">
                            {saving === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Enregistrer
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
