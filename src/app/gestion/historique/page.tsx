"use client";

import { motion } from "framer-motion";
import { Download, History } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockHistory } from "@/data/mock";

export default function HistoriquePage() {
  return (
    <AdminLayout title="Historique">
      <div className="max-w-5xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <History className="h-4 w-4 text-cyan" />
            {mockHistory.length} concours archivés
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toast.success("Export CSV — Action mockée")}
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Période</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Gagnant</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Part.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockHistory.map((entry, idx) => (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + idx * 0.04 }}
                      className="hover:bg-surface-2/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {entry.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={entry.avatar} alt={entry.winner} />
                            <AvatarFallback>{entry.winner[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-text-primary">{entry.winner}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-text-secondary">
                        {entry.participations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-text-secondary">
                        {entry.votes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted hidden md:table-cell">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="archived">Archivé</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
