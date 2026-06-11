"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventSlug } from "@/hooks/useEventSlug";
import { apiFetch } from "@/lib/api-client";
import { TeamAutoAssign } from "@/components/admin/TeamAutoAssign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

interface Team {
  id: string;
  letter: string;
  name: string;
  color: string;
  memberCount?: number;
}

const defaultNewTeam = { letter: "", name: "", color: "#0052cc" };

export function TeamSettings() {
  const { slug, api } = useEventApi();
  const eventSlug = useEventSlug();
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeam, setNewTeam] = useState(defaultNewTeam);
  const [message, setMessage] = useState("");

  const load = () => {
    api<{ teams: Team[] }>("/teams").then((d) => setTeams(d.teams));
  };

  useEffect(() => {
    load();
  }, [slug]);

  const updateTeam = (id: string, field: keyof Pick<Team, "letter" | "name" | "color">, value: string) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api("/teams", {
        method: "PATCH",
        body: JSON.stringify({
          teams: teams.map(({ id, letter, name, color }) => ({ id, letter, name, color })),
        }),
      });
      setMessage("Teams saved.");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save teams");
    } finally {
      setSaving(false);
    }
  };

  const addTeam = async () => {
    setAdding(true);
    setMessage("");
    try {
      await api("/teams", {
        method: "POST",
        body: JSON.stringify({
          letter: newTeam.letter,
          name: newTeam.name,
          color: newTeam.color,
        }),
      });
      setNewTeam(defaultNewTeam);
      setShowAddForm(false);
      setMessage("Team added.");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add team");
    } finally {
      setAdding(false);
    }
  };

  const seedFigma = async () => {
    setSeeding(true);
    setMessage("");
    try {
      const result = await api<{ created: string[]; skipped: string[] }>("/teams", {
        method: "POST",
        body: JSON.stringify({ action: "seed_figma" }),
      });
      const parts = [];
      if (result.created.length) parts.push(`added ${result.created.join(", ")}`);
      if (result.skipped.length) parts.push(`skipped existing ${result.skipped.join(", ")}`);
      setMessage(parts.length ? `FIGMA teams: ${parts.join("; ")}.` : "FIGMA teams already set up.");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to seed FIGMA teams");
    } finally {
      setSeeding(false);
    }
  };

  const deleteTeam = async (team: Team) => {
    const label = team.name || team.letter;
    if (
      !window.confirm(
        `Delete team "${label}"? Participants will be unassigned. Team chat and scores for this team will be removed.`,
      )
    ) {
      return;
    }

    setDeletingId(team.id);
    setMessage("");
    try {
      await apiFetch(eventSlug, `/teams/${team.id}`, { method: "DELETE" });
      setMessage(`Deleted team "${label}".`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete team");
    } finally {
      setDeletingId(null);
    }
  };

  const canAdd = newTeam.letter.trim().length > 0 && newTeam.name.trim().length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Teams</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Full team management — add, edit, or remove teams. Use any team code you like; for FIGMA
          events, quick-add the F / I / G / M / A set.
        </p>
        <div className="mt-4 space-y-3">
          {teams.length === 0 && !showAddForm && (
            <p className="text-sm text-muted-foreground">No teams yet. Add teams or seed FIGMA.</p>
          )}
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <span
                className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.letter}
              </span>
              <Input
                value={team.letter}
                onChange={(e) => updateTeam(team.id, "letter", e.target.value.toUpperCase())}
                placeholder="Code"
                className="w-24 font-mono uppercase"
              />
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
              <span className="text-xs text-muted-foreground">
                {team.memberCount ?? 0} member{(team.memberCount ?? 0) === 1 ? "" : "s"}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => deleteTeam(team)}
                disabled={deletingId === team.id}
              >
                {deletingId === team.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          ))}
          {showAddForm && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <Input
                value={newTeam.letter}
                onChange={(e) =>
                  setNewTeam((prev) => ({ ...prev, letter: e.target.value.toUpperCase() }))
                }
                placeholder="Code"
                className="w-24 font-mono uppercase"
              />
              <Input
                value={newTeam.name}
                onChange={(e) => setNewTeam((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Team name"
                className="min-w-[140px] flex-1"
              />
              <input
                type="color"
                value={newTeam.color}
                onChange={(e) => setNewTeam((prev) => ({ ...prev, color: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                aria-label="Team color"
              />
              <Button onClick={addTeam} disabled={adding || !canAdd} size="sm">
                {adding ? "Adding…" : "Create"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTeam(defaultNewTeam);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!showAddForm && (
            <Button variant="secondary" onClick={() => setShowAddForm(true)}>
              Add team
            </Button>
          )}
          <Button variant="secondary" onClick={seedFigma} disabled={seeding}>
            {seeding ? "Adding FIGMA…" : "Quick add FIGMA teams"}
          </Button>
          {teams.length > 0 && (
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save teams"}
            </Button>
          )}
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </Card>

      <TeamAutoAssign onMessage={setMessage} />
    </div>
  );
}
