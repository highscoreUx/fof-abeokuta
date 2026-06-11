"use client";

import { useState } from "react";
import { TeamAutoAssignModal } from "@/components/admin/TeamAutoAssignModal";
import { TeamModal } from "@/components/admin/TeamModal";
import { TeamsTable } from "@/components/admin/TeamsTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamRow } from "@/types/teams";

export function TeamSettings() {
  const [formOpen, setFormOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [message, setMessage] = useState("");

  const openAdd = () => {
    setEditingTeam(null);
    setFormOpen(true);
  };

  const openEdit = (team: TeamRow) => {
    setEditingTeam(team);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTeam(null);
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Teams</CardTitle>
            <CardDescription>
              Add, edit, or remove teams. Use any code and color theme that fits your event.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAutoAssignOpen(true)}>
              Auto assign settings
            </Button>
            <Button onClick={openAdd}>Add team</Button>
          </div>
        </CardHeader>

        <TeamsTable onEdit={openEdit} />
      </Card>

      <TeamModal
        open={formOpen}
        onClose={closeForm}
        team={editingTeam}
        onSaved={() => setMessage(editingTeam ? "Team updated." : "Team created.")}
      />

      <TeamAutoAssignModal
        open={autoAssignOpen}
        onClose={() => setAutoAssignOpen(false)}
        onMessage={setMessage}
      />
    </div>
  );
}
