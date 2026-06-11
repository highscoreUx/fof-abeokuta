"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

interface Team {
  id: string;
  letter: string;
  name: string;
  color: string;
}

export function TeamSettings() {
  const { slug, api } = useEventApi();
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    api<{ teams: Team[] }>("/teams").then((d) => setTeams(d.teams));
  };

  useEffect(() => {
    load();
  }, [slug]);

  const updateTeam = (id: string, field: "name" | "color", value: string) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api("/teams", {
        method: "PATCH",
        body: JSON.stringify({ teams: teams.map(({ id, name, color }) => ({ id, name, color })) }),
      });
      setMessage("Teams saved.");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save teams");
    } finally {
      setSaving(false);
    }
  };

  const assignTeams = async () => {
    setMessage("");
    try {
      await api("/users/assign-teams", { method: "POST", body: JSON.stringify({}) });
      setMessage("Participants re-assigned across teams.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to assign teams");
    }
  };

  return (
    <Card>
      <CardTitle>Teams</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure team names and colors. Letters (F/I/G/M/A) are fixed for this event format.
      </p>
      <div className="mt-4 space-y-3">
        {teams.map((team) => (
          <div key={team.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: team.color }}
            >
              {team.letter}
            </span>
            <Input
              value={team.name}
              onChange={(e) => updateTeam(team.id, "name", e.target.value)}
              placeholder="Team name"
              className="min-w-[140px] flex-1"
            />
            <input
              type="color"
              value={team.color}
              onChange={(e) => updateTeam(team.id, "color", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
              aria-label={`Color for team ${team.letter}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving || teams.length === 0}>
          {saving ? "Saving…" : "Save teams"}
        </Button>
        <Button variant="secondary" onClick={assignTeams}>
          Re-assign participants
        </Button>
      </div>
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </Card>
  );
}
