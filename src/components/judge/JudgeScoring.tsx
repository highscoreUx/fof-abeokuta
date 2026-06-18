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
}

interface Criterion {
  id: string;
  name: string;
  maxPoints: number;
}

interface Score {
  teamId: string;
  criterionId: string;
  points: number;
}

export function JudgeScoring() {
  const { slug, api } = useEventApi();
  const [teams, setTeams] = useState<Team[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    Promise.all([
      api<{ teams: Team[] }>("/teams"),
      api<{ criteria: Criterion[] }>("/criteria"),
      api<{ scores: Score[] }>("/scores"),
    ]).then(([teamsData, criteriaData, scoresData]) => {
      setTeams(teamsData.teams);
      setCriteria(criteriaData.criteria);
      const existing: Record<string, number> = {};
      for (const s of scoresData.scores) {
        existing[`${s.teamId}-${s.criterionId}`] = s.points;
      }
      setScores(existing);
    });
  }, [slug, api]);

  const saveScore = async (teamId: string, criterionId: string) => {
    const key = `${teamId}-${criterionId}`;
    const points = scores[key] ?? 0;
    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      await api("/scores", {
        method: "POST",
        body: JSON.stringify({ teamId, criterionId, points }),
      });
      setSavedKeys((prev) => new Set(prev).add(key));
      setTimeout(() => {
        setSavedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 2000);
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (teams.length === 0) {
    return <Card><p>Loading teams...</p></Card>;
  }

  return (
    <div className="space-y-6">
      {teams.map((team) => (
        <Card key={team.id}>
          <CardTitle>Team {team.letter} — {team.name}</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {criteria.map((c) => {
              const key = `${team.id}-${c.id}`;
              const saving = savingKeys.has(key);
              const saved = savedKeys.has(key);
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <label className="flex-1 text-sm">{c.name} (max {c.maxPoints})</label>
                  <Input
                    type="number"
                    min={0}
                    max={c.maxPoints}
                    value={scores[key] ?? ""}
                    disabled={saving}
                    onChange={(e) =>
                      setScores((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-20"
                  />
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => void saveScore(team.id, c.id)}
                  >
                    {saving ? "Saving…" : saved ? "Saved" : "Save"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
