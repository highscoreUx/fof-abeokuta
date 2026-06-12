"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AddQuestionModal } from "@/components/admin/AddQuestionModal";
import { BulkAddQuestionsModal } from "@/components/admin/BulkAddQuestionsModal";
import { QuestionActionsBar } from "@/components/admin/QuestionActionsBar";
import { SpreadsheetImportModal } from "@/components/admin/SpreadsheetImportModal";
import { Card } from "@/components/ui/card";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { formatInstanceScope } from "@/lib/activities/catalog";
import { KAHOOT_OPTIONS } from "@/lib/kahoot-ui";
import { TRIVIA_TYPE_LABELS } from "@/lib/trivia/types";
import { isMediaUrl } from "@/lib/trivia/media";
import { SurveyConfigurePanel } from "@/components/admin/SurveyConfigurePanel";
import { SpinnerConfigurePanel } from "@/components/admin/SpinnerConfigurePanel";
import { TicTacToeConfigurePanel } from "@/components/admin/TicTacToeConfigurePanel";
import type { ActivityConfigureKind, KahootActivityDetail } from "@/types/activities";

export function ActivityConfigureView() {
  const params = useParams<{ kind: string; id: string }>();
  const rawKind = params.kind;
  const configureKind = (rawKind === "spin" ? "spinner" : rawKind) as ActivityConfigureKind;
  const id = params.id;
  const { api } = useEventApi();
  const { activities } = useEventNav();

  const [kahoot, setKahoot] = useState<KahootActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [singleOpen, setSingleOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (configureKind === "kahoot") {
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
      } else if (configureKind === "spinner" || configureKind === "tic_tac_toe") {
        // Detail loaded by configure panel
      } else if (configureKind === "survey") {
        // Survey detail loaded by SurveyConfigurePanel
      } else {
        setLoadError("Unknown activity type.");
      }
    } catch {
      setLoadError("Activity not found.");
    } finally {
      setLoading(false);
    }
  }, [api, id, configureKind]);

  useEffect(() => {
    void load();
  }, [load]);

  const activity = configureKind === "kahoot" ? kahoot : null;
  useAdminPageTitle(activity?.title ?? null);
  const scope = activity
    ? formatInstanceScope({
        allowGeneralParticipants: activity.allowGeneralParticipants,
        allowGroupParticipants: activity.allowGroupParticipants,
      })
    : "";
  const typeLabel =
    configureKind === "kahoot"
      ? "Live Trivia"
      : configureKind === "survey"
        ? "Survey"
        : configureKind === "tic_tac_toe"
          ? "Team Tic-Tac-Toe"
          : "Spinner";
  const permission =
    configureKind === "kahoot"
      ? "quiz.manage"
      : configureKind === "survey"
        ? "survey.manage"
        : configureKind === "tic_tac_toe"
          ? "tic_tac_toe.manage"
          : "spin.manage";

  return (
    <PermissionGuard permission={permission} embedded>
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

        {!loading && !loadError && kahoot && configureKind === "kahoot" && (
          <>
            <Card className="w-full p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Questions ({kahoot.questions.length})</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review and manage the question set for this activity.
                  </p>
                </div>
                <QuestionActionsBar
                  onAddSingle={() => setSingleOpen(true)}
                  onAddBulk={() => setBulkOpen(true)}
                  onAddSpreadsheet={() => setSpreadsheetOpen(true)}
                />
              </div>

              {kahoot.questions.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  No questions yet. Use Add question to create one, add several in bulk, or import
                  from a spreadsheet.
                </p>
              ) : (
                <ol className="mt-6 space-y-3">
                  {kahoot.questions.map((q, i) => {
                    const qType = q.type ?? "QUIZ";
                    const isImageMcq = qType === "QUIZ_IMAGE";
                    const isImagePuzzle = qType === "PUZZLE_IMAGE";
                    return (
                      <li key={q.id} className="rounded-xl border border-border p-4">
                        <p className="font-medium">
                          {i + 1}. {q.text}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            · {TRIVIA_TYPE_LABELS[qType]}
                            {q.timeLimitSec ? ` · ${q.timeLimitSec}s` : ""}
                          </span>
                        </p>
                        {q.mediaUrl && isMediaUrl(q.mediaUrl) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={q.mediaUrl}
                            alt=""
                            className="mt-3 max-h-24 rounded-lg border border-border object-contain"
                          />
                        )}
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                                  {isImageMcq || isImagePuzzle ? (
                                    isMediaUrl(opt) ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={opt}
                                        alt=""
                                        className="h-12 w-12 rounded object-cover"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">No image</span>
                                    )
                                  ) : (
                                    <>
                                      <span className={isCorrect ? "" : "text-muted-foreground"}>
                                        {style.shape}
                                      </span>
                                      {opt}
                                    </>
                                  )}
                                  {isCorrect && !isImagePuzzle && (
                                    <span className="ml-auto text-xs">Correct</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

            <AddQuestionModal
              open={singleOpen}
              onClose={() => setSingleOpen(false)}
              quizId={kahoot.id}
              onAdded={load}
            />
            <BulkAddQuestionsModal
              open={bulkOpen}
              onClose={() => setBulkOpen(false)}
              quizId={kahoot.id}
              onAdded={load}
            />
            <SpreadsheetImportModal
              open={spreadsheetOpen}
              onClose={() => setSpreadsheetOpen(false)}
              quizId={kahoot.id}
              onImported={load}
            />
          </>
        )}

        {!loading && !loadError && configureKind === "survey" && (
          <SurveyConfigurePanel surveyId={id} onReload={load} />
        )}

        {!loading && !loadError && configureKind === "spinner" && (
          <SpinnerConfigurePanel spinnerId={id} onReload={load} />
        )}

        {!loading && !loadError && configureKind === "tic_tac_toe" && (
          <TicTacToeConfigurePanel challengeId={id} onReload={load} />
        )}
    </PermissionGuard>
  );
}
