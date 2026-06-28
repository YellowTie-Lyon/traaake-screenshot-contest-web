"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { mockAdminSettings } from "@/data/mock";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function ReglagesPage() {
  const [settings, setSettings] = useState(mockAdminSettings);

  const handleSave = () => {
    toast.success("Paramètres sauvegardés (mode mocké)");
  };

  return (
    <AdminLayout title="Réglages">
      <div className="space-y-6 max-w-2xl">
        {/* Discord */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Configuration Discord</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel">Canal Discord</Label>
                <Input
                  id="channel"
                  value={settings.discordChannel}
                  onChange={(e) => setSettings({ ...settings, discordChannel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle photographe</Label>
                <Input
                  id="role"
                  value={settings.photographerRole}
                  onChange={(e) => setSettings({ ...settings, photographerRole: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Horaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jour d&apos;ouverture</Label>
                  <Select
                    value={settings.openDay}
                    onValueChange={(v) => setSettings({ ...settings, openDay: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openTime">Heure d&apos;ouverture</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={settings.openTime}
                    onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jour de fermeture</Label>
                  <Select
                    value={settings.closeDay}
                    onValueChange={(v) => setSettings({ ...settings, closeDay: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime">Heure de fermeture</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={settings.closeTime}
                    onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Points */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Système de points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="participationPoints">Participation</Label>
                  <Input
                    id="participationPoints"
                    type="number"
                    value={settings.participationPoints}
                    onChange={(e) => setSettings({ ...settings, participationPoints: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="top3Points">Top 3</Label>
                  <Input
                    id="top3Points"
                    type="number"
                    value={settings.top3Points}
                    onChange={(e) => setSettings({ ...settings, top3Points: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="winnerPoints">Victoire</Label>
                  <Input
                    id="winnerPoints"
                    type="number"
                    value={settings.winnerPoints}
                    onChange={(e) => setSettings({ ...settings, winnerPoints: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Mode automatique</p>
                  <p className="text-xs text-text-muted">Ouverture/fermeture automatique selon l&apos;horaire</p>
                </div>
                <Switch
                  checked={settings.autoMode}
                  onCheckedChange={(v) => setSettings({ ...settings, autoMode: v })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Announcement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Message d&apos;annonce</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={settings.announcementMessage}
                onChange={(e) => setSettings({ ...settings, announcementMessage: e.target.value })}
              />
            </CardContent>
          </Card>
        </motion.div>

        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Sauvegarder les paramètres
        </Button>
      </div>
    </AdminLayout>
  );
}
