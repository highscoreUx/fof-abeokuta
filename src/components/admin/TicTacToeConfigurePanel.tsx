"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ChampionshipBracketPanel } from "@/components/activity-bracket/ChampionshipBracketPanel";
import { useEventApi } from "@/hooks/useEventApi";
import { formatInstanceScope } from "@/lib/activities/catalog";
import type { ActivityBracketSnapshot } from "@/lib/activity-bracket/types";
import type { ActivityCompetitionFormat } from "@/lib/activity-bracket/types";
import { toastError } from "@/lib/toast";
import { formatTeamMatchLabel } from "@/lib/chat-social-challenges";
import type { TicTacToeMode } from "@/lib/tic-tac-toe/types";

interface TeamOption {
  id: string;
  letter: string;
  name: string;
}

interface TttMatchRow {
  id: string;
  state: string;
  teamX: TeamOption | null;
  teamO: TeamOption | null;
}

interface TttDetail {
  id: string;
  title: string;
  mode: TicTacToeMode;
  competitionFormat: ActivityCompetitionFormat;
  targetWins: number;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  matches: TttMatchRow[];
  bracket?: ActivityBracketSnapshot | null;
}

interface TicTacToeConfigurePanelProps {
  challengeId: string;
  onReload?: () => void;
}

export function TicTacToeConfigurePanel({ challengeId, onReload }: TicTacToeConfigurePanelProps) {
  const { api } = useEventApi();
  const [challenge, setChallenge] = useState<TttDetail | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [mode, setMode] = useState<TicTacToeMode>("CHAMPION");
  const [competitionFormat, setCompetitionFormat] =
    useState<ActivityCompetitionFormat>("SINGLE_MATCH");
  const [targetWins, setTargetWins] = useState(1);
  const [teamXId, setTeamXId] = useState("");
  const [teamOId, setTeamOId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [startingBracket, setStartingBracket] = useState(false);
  const [restartingBracket, setRestartingBracket] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, teamsRes] = await Promise.all([
        api<{ challenge: TttDetail }>(`/tic-tac-toe-challenges/${challengeId}`),
        api<{ teams: TeamOption[] }>("/teams"),
      ]);
      setChallenge(detail.challenge);
      setMode(detail.challenge.mode);
      setCompetitionFormat(detail.challenge.competitionFormat ?? "SINGLE_MATCH");
      setTargetWins(detail.challenge.targetWins ?? 1);
      setTeams(teamsRes.teams ?? []);
      if (!teamXId && teamsRes.teams?.[0]) setTeamXId(teamsRes.teams[0].id);
      if (!teamOId && teamsRes.teams?.[1]) setTeamOId(teamsRes.teams[1].id);
    } catch {
      toastError("Failed to load tournament", "Tournament not found.");
    } finally {
      setLoading(false);
    }
  }, [api, challengeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/tic-tac-toe-challenges/${challengeId}`, {
        method: "PATCH",
        body: JSON.stringify({ mode, competitionFormat, targetWins }),
      });
      await load();
      await onReload?.();
    } catch (e) {
      toastError("Failed to save", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const createMatch = async () => {
    if (!teamXId || !teamOId) {
      toastError("Missing teams", "Select both teams.");
      return;
    }
    setCreating(true);
    try {
      await api(`/tic-tac-toe-challenges/${challengeId}/matches`, {
        method: "POST",
        body: JSON.stringify({ teamXId, teamOId }),
      });
      await load();
      await onReload?.();
    } catch (e) {
      toastError("Failed to create match", e instanceof Error ? e.message : undefined);
    } finally {
      setCreating(false);
    }
  };

  const startChampionship = async () => {
    setStartingBracket(true);
    try {
      await save();
      await api(`/tic-tac-toe-challenges/${challengeId}/bracket/start`, { method: "POST" });
      await load();
      await onReload?.();
    } catch (e) {
      toastError("Failed to start championship", e instanceof Error ? e.message : undefined);
    } finally {
      setStartingBracket(false);
    }
  };

  const restartChampionship = async () => {
    if (
      !window.confirm(
        "Restart the championship? All bracket progress will be cleared and teams will be re-paired.",
      )
    ) {
      return;
    }
    setRestartingBracket(true);
    try {
      await api(`/tic-tac-toe-challenges/${challengeId}/bracket/restart`, { method: "POST" });
      await load();
      await onReload?.();
    } catch (e) {
      toastError("Failed to restart championship", e instanceof Error ? e.message : undefined);
    } finally {
      setRestartingBracket(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!challenge) return <p className="text-muted-foreground">Tournament not found.</p>;

  const scope = formatInstanceScope({
    allowGeneralParticipants: challenge.allowGeneralParticipants,
    allowGroupParticipants: challenge.allowGroupParticipants,
  });

  const isChampionship = competitionFormat === "CHAMPIONSHIP";
  const bracketStarted = challenge.bracket && challenge.bracket.state !== "SETUP";

  return (
    <Card className="w-full p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{challenge.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Team Tic-Tac-Toe · {scope}</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Competition format</label>
            <Select
              className="w-full"
              value={competitionFormat}
              onChange={(e) =>
                setCompetitionFormat(e.target.value as ActivityCompetitionFormat)
              }
              disabled={Boolean(bracketStarted)}
            >
              <option value="SINGLE_MATCH">Single match — pick two teams</option>
              <option value="CHAMPIONSHIP">Championship — all teams, bracket rounds</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Race to (wins per matchup)</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={targetWins}
              onChange={(e) => setTargetWins(Number(e.target.value) || 1)}
              disabled={Boolean(bracketStarted)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Team play mode</label>
          <Select
            className="w-full max-w-md"
            value={mode}
            onChange={(e) => setMode(e.target.value as TicTacToeMode)}
          >
            <option value="CHAMPION">Champion — one player moves per team</option>
            <option value="COUNCIL">Council — team votes on each move</option>
          </Select>
        </div>

        <Button onClick={save} disabled={saving || Boolean(bracketStarted)}>
          {saving ? "Saving…" : "Save settings"}
        </Button>

        {isChampionship ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All event teams are randomly paired each round. With an odd number of teams, one team
              gets a bye into the next round. Winners advance until one champion remains.
            </p>
            {!bracketStarted && (
              <Button onClick={startChampionship} disabled={startingBracket}>
                {startingBracket ? "Starting…" : "Start championship"}
              </Button>
            )}
            {challenge.bracket?.state === "FINISHED" && (
              <Button
                variant="secondary"
                onClick={restartChampionship}
                disabled={restartingBracket}
              >
                {restartingBracket ? "Restarting…" : "Restart championship"}
              </Button>
            )}
            <ChampionshipBracketPanel
              challengeId={challengeId}
              gameType="tic_tac_toe"
              initialBracket={challenge.bracket}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Pair teams for a match</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Team X</label>
                <Select value={teamXId} onChange={(e) => setTeamXId(e.target.value)} className="w-full">
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.letter} — {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Team O</label>
                <Select value={teamOId} onChange={(e) => setTeamOId(e.target.value)} className="w-full">
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.letter} — {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button className="mt-3" variant="secondary" onClick={createMatch} disabled={creating}>
              {creating ? "Creating…" : "Create match"}
            </Button>
          </div>
        )}

        {!isChampionship && challenge.matches.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Matches</p>
            <ul className="space-y-2 text-sm">
              {challenge.matches
                .filter((match) => match.teamX && match.teamO)
                .map((m) => (
                <li key={m.id} className="rounded-lg border border-border px-3 py-2">
                  {formatTeamMatchLabel(m.teamX, m.teamO)}
                  <span className="ml-2 text-muted-foreground">· {m.state}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
