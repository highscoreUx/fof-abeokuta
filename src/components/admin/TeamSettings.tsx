"use client";

import { useState } from "react";
import { TeamAutoAssign } from "@/components/admin/TeamAutoAssign";
import { TeamModal } from "@/components/admin/TeamModal";
import { TeamsTable } from "@/components/admin/TeamsTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamRow } from "@/types/teams";

export function TeamSettings() {
  const [formOpen, setFormOpen] = useState(false);
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Teams</CardTitle>
            <CardDescription>
              Add, edit, or remove teams. Use any code and color theme that fits your event.
            </CardDescription>
          </div>
          <Button className="shrink-0" onClick={openAdd}>
            Add team
          </Button>
        </CardHeader>

        <TeamsTable onEdit={openEdit} />
      </Card>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <TeamAutoAssign onMessage={setMessage} />

      <TeamModal
        open={formOpen}
        onClose={closeForm}
        team={editingTeam}
        onSaved={() => setMessage(editingTeam ? "Team updated." : "Team created.")}
      />
    </div>
  );
}
