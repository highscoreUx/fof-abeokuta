"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useEventApi } from "@/hooks/useEventApi";
import { SURVEY_TYPE_LABELS, type SurveyQuestionType } from "@/lib/survey/types";
import type { SurveyActivityDetail } from "@/types/activities";

interface SurveyConfigurePanelProps {
  surveyId: string;
  onReload: () => Promise<void>;
}

export function SurveyConfigurePanel({ surveyId, onReload }: SurveyConfigurePanelProps) {
  const { api } = useEventApi();
  const [survey, setSurvey] = useState<SurveyActivityDetail | null>(null);
  const [results, setResults] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionType, setQuestionType] = useState<SurveyQuestionType>("POLL");
  const [questionText, setQuestionText] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ survey: SurveyActivityDetail }>(`/surveys/${surveyId}`);
      setSurvey({
        ...data.survey,
        kind: "survey",
        questions: data.survey.questions ?? [],
        opensAt: data.survey.opensAt ? String(data.survey.opensAt) : null,
        closesAt: data.survey.closesAt ? String(data.survey.closesAt) : null,
      });
    } finally {
      setLoading(false);
    }
  }, [api, surveyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadResults = async () => {
    const data = await api<{ results: unknown[] }>(`/surveys/${surveyId}/results`);
    setResults(data.results);
  };

  const patchSurvey = async (patch: Record<string, unknown>) => {
    await api(`/surveys/${surveyId}`, { method: "PATCH", body: JSON.stringify(patch) });
    await load();
    await onReload();
  };

  const addQuestion = async () => {
    if (!questionText.trim()) return;
    setSaving(true);
    try {
      const config: Record<string, unknown> = {};
      if (questionType === "POLL") {
        config.options = pollOptions.map((o) => o.trim()).filter(Boolean);
      }
      if (questionType === "SCALE") {
        config.min = 1;
        config.max = 5;
      }
      if (questionType === "NPS") {
        config.min = 0;
        config.max = 10;
      }
      await api(`/surveys/${surveyId}/questions`, {
        method: "POST",
        body: JSON.stringify({ type: questionType, text: questionText.trim(), config }),
      });
      setQuestionText("");
      setPollOptions(["", ""]);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !survey) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Survey settings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Opens at (optional)</label>
            <Input
              type="datetime-local"
              defaultValue={survey.opensAt?.slice(0, 16) ?? ""}
              onBlur={(e) =>
                void patchSurvey({ opensAt: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Closes at (optional)</label>
            <Input
              type="datetime-local"
              defaultValue={survey.closesAt?.slice(0, 16) ?? ""}
              onBlur={(e) =>
                void patchSurvey({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
            />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={survey.allowEditsUntilClose}
            onChange={(e) => void patchSurvey({ allowEditsUntilClose: e.target.checked })}
          />
          Allow edits until close
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {survey.status !== "OPEN" && (
            <Button onClick={() => void patchSurvey({ status: "OPEN" })}>Open survey</Button>
          )}
          {survey.status === "OPEN" && (
            <Button variant="danger" onClick={() => void patchSurvey({ status: "CLOSED" })}>
              Close survey
            </Button>
          )}
          <Button variant="secondary" onClick={() => void loadResults()}>
            View results
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Questions ({survey.questions.length})</h2>
        {survey.questions.length > 0 && (
          <ol className="mt-4 space-y-2">
            {survey.questions.map((q, i) => (
              <li key={q.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">
                  {i + 1}. {q.text}
                </span>
                <span className="ml-2 text-muted-foreground">({SURVEY_TYPE_LABELS[q.type]})</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-6 space-y-3 rounded-xl border border-border p-4">
          <h3 className="font-semibold">Add question</h3>
          <Select value={questionType} onChange={(e) => setQuestionType(e.target.value as SurveyQuestionType)}>
            {Object.entries(SURVEY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Question text"
          />
          {questionType === "POLL" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {pollOptions.map((opt, i) => (
                <Input
                  key={i}
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                />
              ))}
            </div>
          )}
          <Button onClick={addQuestion} disabled={saving}>
            {saving ? "Adding…" : "Add question"}
          </Button>
        </div>
      </Card>

      {results && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Results</h2>
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(results, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
