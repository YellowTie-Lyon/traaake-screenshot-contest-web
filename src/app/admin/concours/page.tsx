"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, PauseCircle, XCircle, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockCurrentContest } from "@/data/mock";
import type { ContestStatus } from "@/types";

const statusLabels: Record<ContestStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  paused: "Suspendu",
  closed: "Fermé",
  archived: "Archivé",
};

const statusVariants: Record<ContestStatus, "default" | "open" | "paused" | "closed" | "archived" | "draft"> = {
  draft: "draft",
  open: "open",
  paused: "paused",
  closed: "closed",
  archived: "archived",
};

export default function ConcoursPage() {
  const [status, setStatus] = useState<ContestStatus>(mockCurrentContest.status);

  const handleAction = (newStatus: ContestStatus, label: string) => {
    setStatus(newStatus);
    toast.success(`${label} — Action mockée. Connectez Supabase en Phase 2.`);
  };

  return (
    <AdminLayout title="Gestion du Concours">
      <div className="space-y-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-cyan" />
                Concours actuel
                <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-muted">Début</p>
                  <p className="text-text-primary font-medium">{mockCurrentContest.startDate}</p>
                </div>
                <div>
                  <p className="text-text-muted">Fin</p>
                  <p className="text-text-primary font-medium">{mockCurrentContest.endDate}</p>
                </div>
                <div>
                  <p className="text-text-muted">Participations</p>
                  <p className="text-text-primary font-medium">{mockCurrentContest.participations}</p>
                </div>
                <div>
                  <p className="text-text-muted">Votes</p>
                  <p className="text-text-primary font-medium">{mockCurrentContest.totalVotes}</p>
                </div>
                <div>
                  <p className="text-text-muted">Thème</p>
                  <p className="text-cyan font-medium">{mockCurrentContest.theme}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  onClick={() => handleAction("open", "Concours ouvert")}
                  disabled={status === "open"}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" /> Ouvrir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction("paused", "Concours suspendu")}
                  disabled={status === "paused"}
                  className="gap-2"
                >
                  <PauseCircle className="h-4 w-4" /> Suspendre
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction("closed", "Concours fermé")}
                  disabled={status === "closed"}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" /> Fermer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toast.success("Votes recalculés — Action mockée")}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Recalculer les votes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
