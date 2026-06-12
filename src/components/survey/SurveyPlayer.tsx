"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { isSurveyOpen, parseSurveyConfig, SURVEY_TYPE_LABELS } from "@/lib/survey/types";
import type { SurveyAnswerValue, SurveyQuestionType } from "@/lib/survey/types";

interface SurveyListItem {
  id: string;
  title: string;
  status: string;
  opensAt: string | null;
  closesAt: string | null;
  allowEditsUntilClose: boolean;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  questions: Array<{
    id: string;
    type: SurveyQuestionType;
    text: string;
    config: unknown;
    mediaUrl?: string | null;
    required?: boolean;
  }>;
}

export function SurveyPlayer() {
  const { api } = useEventApi();
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ surveys: SurveyListItem[] }>("/surveys").catch(() => ({ surveys: [] }));
    setSurveys(data.surveys);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = surveys.find((s) => s.id === activeId);
  const openSurveys = surveys.filter((s) => isSurveyOpen(s));

  const loadResponse = useCallback(
    async (surveyId: string) => {
      const data = await api<{ response: { answers: Array<{ questionId: string; value: SurveyAnswerValue }> } | null }>(
        `/surveys/${surveyId}/submit`,
      ).catch(() => ({ response: null }));
      if (data.response?.answers) {
        const map: Record<string, SurveyAnswerValue> = {};
        for (const a of data.response.answers) map[a.questionId] = a.value as SurveyAnswerValue;
        setAnswers(map);
      } else {
        setAnswers({});
      }
    },
    [api],
  );

  useEffect(() => {
    if (activeId) void loadResponse(activeId);
  }, [activeId, loadResponse]);

  const setAnswer = (questionId: string, value: SurveyAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submit = async () => {
    if (!active) return;
    setSaving(true);
    setMessage(null);
    try {
      await api(`/surveys/${active.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: active.questions.map((q) => ({
            questionId: q.id,
            value: answers[q.id] ?? {},
          })),
        }),
      });
      setMessage("Response saved.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  if (!active) {
    return (
      <Card>
        <CardTitle>Surveys</CardTitle>
        {openSurveys.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No open surveys right now.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {openSurveys.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-border px-4 py-3 text-left transition hover:bg-muted"
                  onClick={() => setActiveId(s.id)}
                >
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.questions.length} question{s.questions.length === 1 ? "" : "s"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <CardTitle>{active.title}</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setActiveId(null)}>
          Back
        </Button>
      </div>
      <div className="mt-6 space-y-6">
        {active.questions.map((q, i) => {
          const config = parseSurveyConfig(q.config);
          const value = answers[q.id] ?? {};
          return (
            <div key={q.id} className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {SURVEY_TYPE_LABELS[q.type]}
                {q.required ? " · Required" : ""}
              </p>
              <p className="mt-1 font-medium">
                {i + 1}. {q.text}
              </p>

              {q.type === "POLL" && (
                <div className="mt-3 space-y-2">
                  {(config.options ?? []).map((opt, optIndex) => (
                    <button
                      key={optIndex}
                      type="button"
                      className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        value.optionIndex === optIndex
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                      onClick={() => setAnswer(q.id, { optionIndex: optIndex })}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(q.type === "WORD_CLOUD" || q.type === "BRAINSTORM" || q.type === "OPEN_ENDED") && (
                <Input
                  className="mt-3"
                  value={value.text ?? ""}
                  placeholder={config.placeholder ?? "Your answer"}
                  onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                />
              )}

              {(q.type === "SCALE" || q.type === "NPS") && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={config.min ?? (q.type === "NPS" ? 0 : 1)}
                    max={config.max ?? (q.type === "NPS" ? 10 : 5)}
                    value={value.value ?? config.min ?? 0}
                    onChange={(e) => setAnswer(q.id, { value: Number(e.target.value) })}
                    className="w-full"
                  />
                  <p className="mt-1 text-center font-bold">{value.value ?? config.min ?? 0}</p>
                </div>
              )}

              {q.type === "DROP_PIN" && q.mediaUrl && (
                <button
                  type="button"
                  className="relative mt-3 w-full overflow-hidden rounded-xl border border-border"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pin = {
                      x: (e.clientX - rect.left) / rect.width,
                      y: (e.clientY - rect.top) / rect.height,
                    };
                    setAnswer(q.id, { pins: [pin] });
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.mediaUrl} alt="" className="w-full" />
                  {value.pins?.map((pin, pi) => (
                    <span
                      key={pi}
                      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white"
                      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                    />
                  ))}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      <Button className="mt-4" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Submit survey"}
      </Button>
    </Card>
  );
}
