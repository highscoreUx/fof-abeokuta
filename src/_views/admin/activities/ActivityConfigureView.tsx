"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useAuthStore } from "@/stores/authStore";
import { privateApi } from "@/lib/axios";
import { downloadQuizCsvTemplate } from "@/lib/quiz-csv-template";
import { formatInstanceScope } from "@/lib/activities/catalog";
import { KAHOOT_OPTIONS } from "@/lib/kahoot-ui";
import type { ActivityConfigureKind, KahootActivityDetail, SpinActivityDetail } from "@/types/activities";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full rounded-full bg-primary transition-all duration-200"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ActivityConfigureView() {
  const params = useParams<{ kind: string; id: string }>();
  const kind = params.kind as ActivityConfigureKind;
  const id = params.id;
  const { path, api } = useEventApi();
  const { nav, activities } = useEventNav();

  const [kahoot, setKahoot] = useState<KahootActivityDetail | null>(null);
  const [spin, setSpin] = useState<SpinActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimitSec, setTimeLimitSec] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (kind === "kahoot") {
        const data = await api<{
          quiz: {
            id: string;
            title: string;
            allowGeneralParticipants: boolean;
            allowGroupParticipants: boolean;
            questions: KahootActivityDetail["questions"];
          };
        }>(`/quizzes/${id}`);
        setKahoot({
          kind: "kahoot",
          id: data.quiz.id,
          title: data.quiz.title,
          allowGeneralParticipants: data.quiz.allowGeneralParticipants,
          allowGroupParticipants: data.quiz.allowGroupParticipants,
          questions: data.quiz.questions.map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? (q.options as string[]) : undefined,
          })),
        });
      } else if (kind === "spin") {
        const data = await api<{
          challenge: {
            id: string;
            title: string;
            allowGeneralParticipants: boolean;
            allowGroupParticipants: boolean;
            state: string;
          };
        }>(`/spin-challenges/${id}`);
        setSpin({
          kind: "spin",
          id: data.challenge.id,
          title: data.challenge.title,
          allowGeneralParticipants: data.challenge.allowGeneralParticipants,
          allowGroupParticipants: data.challenge.allowGroupParticipants,
          state: data.challenge.state,
        });
      } else {
        setLoadError("Unknown activity type.");
      }
    } catch {
      setLoadError("Activity not found.");
    } finally {
      setLoading(false);
    }
  }, [api, id, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const activity = kind === "kahoot" ? kahoot : spin;
  const scope = activity
    ? formatInstanceScope({
        allowGeneralParticipants: activity.allowGeneralParticipants,
        allowGroupParticipants: activity.allowGroupParticipants,
      })
    : "";
  const typeLabel = kind === "kahoot" ? "Live Trivia" : "Spin to Build";
  const permission = kind === "kahoot" ? "quiz.manage" : "spin.manage";

  const resetQuestionForm = () => {
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setTimeLimitSec(20);
    setQuestionError(null);
  };

  const handleAddQuestion = async () => {
    if (!kahoot) return;
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!questionText.trim()) {
      setQuestionError("Question text is required.");
      return;
    }
    if (trimmedOptions.length < 2) {
      setQuestionError("Add at least two answer options.");
      return;
    }
    if (correctIndex >= trimmedOptions.length) {
      setQuestionError("Correct answer must match one of the options.");
      return;
    }

    setSavingQuestion(true);
    setQuestionError(null);
    try {
      await api(`/quizzes/${kahoot.id}/questions`, {
        method: "POST",
        body: JSON.stringify({
          text: questionText.trim(),
          options: trimmedOptions,
          correctIndex,
          timeLimitSec,
        }),
      });
      resetQuestionForm();
      await load();
    } catch (e) {
      setQuestionError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleUploadCsv = async (file: File) => {
    if (!kahoot) return;
    setUploadError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    const token = useAuthStore.getState().accessToken;

    try {
      await privateApi.post(path(`/quizzes/${kahoot.id}/questions`), formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });
      setUploadProgress(100);
      await load();
      setTimeout(() => setUploadProgress(null), 800);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploadProgress(null);
    }
  };

  return (
    <PermissionGuard permission={permission}>
      <AppShell
        title={activity?.title ?? "Configure activity"}
        nav={nav}
      >
        <div className="mb-6">
          <Link
            href={activities}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to activities
          </Link>
          {activity && (
            <p className="mt-2 text-sm text-muted-foreground">
              {typeLabel} · {scope}
            </p>
          )}
        </div>

        {loading && <p className="text-muted-foreground">Loading…</p>}
        {loadError && <p className="text-danger">{loadError}</p>}

        {!loading && !loadError && kahoot && kind === "kahoot" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Questions ({kahoot.questions.length})</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review and manage the question set for this activity.
              </p>
              {kahoot.questions.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No questions yet. Add one below or import from CSV.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {kahoot.questions.map((q, i) => (
                    <li key={q.id} className="rounded-xl border border-border p-4">
                      <p className="font-medium">
                        {i + 1}. {q.text}
                        {q.timeLimitSec ? (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            · {q.timeLimitSec}s
                          </span>
                        ) : null}
                      </p>
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                          {q.options.map((opt, optIndex) => {
                            const style = KAHOOT_OPTIONS[optIndex % KAHOOT_OPTIONS.length];
                            const isCorrect = q.correctIndex === optIndex;
                            return (
                              <li
                                key={optIndex}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                  isCorrect
                                    ? "bg-success/10 font-semibold text-success"
                                    : "bg-foreground/5"
                                }`}
                              >
                                <span className={isCorrect ? "" : "text-muted-foreground"}>
                                  {style.shape}
                                </span>
                                {opt}
                                {isCorrect && <span className="ml-auto text-xs">Correct</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">Add question</h2>
              <div className="mt-4 space-y-3">
                <Input
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Question text"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.map((opt, i) => (
                    <Input
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Correct answer
                    </label>
                    <Select
                      value={String(correctIndex)}
                      onChange={(e) => setCorrectIndex(Number(e.target.value))}
                    >
                      {options.map((opt, i) => (
                        <option key={i} value={i}>
                          Option {i + 1}
                          {opt.trim() ? `: ${opt.trim()}` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Time limit (sec)
                    </label>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={timeLimitSec}
                      onChange={(e) => setTimeLimitSec(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                </div>
                {questionError && <p className="text-sm text-danger">{questionError}</p>}
                <Button onClick={handleAddQuestion} disabled={savingQuestion}>
                  {savingQuestion ? "Adding…" : "Add question"}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">Import questions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Download the template, fill in your questions, then upload the CSV.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => downloadQuizCsvTemplate()}>
                  Download template
                </Button>
                <label className="cursor-pointer">
                  <span className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                    Upload CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadCsv(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {uploadProgress !== null && (
                <div className="mt-4 space-y-1">
                  <ProgressBar value={uploadProgress} />
                  <p className="text-xs text-muted-foreground">
                    {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : "Processing…"}
                  </p>
                </div>
              )}
              {uploadError && <p className="mt-2 text-sm text-danger">{uploadError}</p>}
            </Card>
          </div>
        )}

        {!loading && !loadError && spin && kind === "spin" && (
          <Card className="mx-auto max-w-3xl p-6">
            <p className="text-sm text-muted-foreground">
              Spin to Build sessions are started from the activities list. Scope: {scope}.
            </p>
          </Card>
        )}
      </AppShell>
    </PermissionGuard>
  );
}
