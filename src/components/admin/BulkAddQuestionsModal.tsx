"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TriviaQuestionFormFields } from "@/components/admin/TriviaQuestionFormFields";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { privateApi } from "@/lib/axios";
import { TRIVIA_TYPE_LABELS, type TriviaQuestionType } from "@/lib/trivia/types";
import {
  buildTriviaQuestionPayload,
  defaultFormStateForType,
  validateTriviaQuestionForm,
} from "@/lib/trivia/question-form-defaults";
import type { QuestionDraft } from "@/lib/quiz-question-form";
import { toastError } from "@/lib/toast";

interface BulkAddQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  quizId: string;
  onAdded: () => Promise<void>;
}

type WizardStep = "count" | "questions" | "review";

interface BulkQuestionEntry {
  questionType: TriviaQuestionType;
  draft: QuestionDraft;
  config: Record<string, unknown>;
  mediaUrl: string | null;
}

function createEmptyEntry(type: TriviaQuestionType = "QUIZ"): BulkQuestionEntry {
  const defaults = defaultFormStateForType(type);
  return {
    questionType: type,
    draft: defaults.draft,
    config: defaults.config,
    mediaUrl: null,
  };
}

function summarizeEntry(entry: BulkQuestionEntry): string {
  const { questionType, draft, config } = entry;
  const options = draft.options.map((o) => o.trim()).filter(Boolean);

  switch (questionType) {
    case "TRUE_FALSE":
      return `Correct: ${draft.correctIndex === 0 ? "True" : "False"}`;
    case "TYPE_ANSWER":
      return `Accepted: ${options.join(", ") || "—"}`;
    case "PUZZLE":
    case "PUZZLE_IMAGE":
      return `${options.length} item(s) to order`;
    case "SLIDER":
      return `Target: ${config.correct ?? "—"} (${config.min ?? 0}–${config.max ?? 100})`;
    case "PIN_ANSWER":
      return "Pin on image";
    case "QUIZ_IMAGE":
      return `Correct image #${draft.correctIndex + 1}`;
  }

  return `Correct: ${options[draft.correctIndex] ?? "—"}`;
}

export function BulkAddQuestionsModal({
  open,
  onClose,
  quizId,
  onAdded,
}: BulkAddQuestionsModalProps) {
  const { api, path } = useEventApi();
  const [step, setStep] = useState<WizardStep>("count");
  const [count, setCount] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entries, setEntries] = useState<BulkQuestionEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setStep("count");
    setCount(3);
    setCurrentIndex(0);
    setEntries([]);
    setSaving(false);
    setUploading(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const startQuestions = () => {
    if (count < 2 || count > 50) {
      toastError("Invalid count", "Enter between 2 and 50 questions.");
      return;
    }
    setEntries(Array.from({ length: count }, () => createEmptyEntry()));
    setCurrentIndex(0);
    setStep("questions");
  };

  const updateEntry = (entry: BulkQuestionEntry) => {
    setEntries((prev) => prev.map((item, i) => (i === currentIndex ? entry : item)));
  };

  const handleTypeChange = (type: TriviaQuestionType) => {
    const defaults = defaultFormStateForType(type);
    updateEntry({
      questionType: type,
      draft: defaults.draft,
      config: defaults.config,
      mediaUrl: null,
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `quizzes/${quizId}`);
      const token = useAuthStore.getState().accessToken;
      const res = await privateApi.post(path("/media"), formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return res.data.asset.url as string;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      toastError("Upload failed", message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  };

  const goNextQuestion = () => {
    const entry = entries[currentIndex];
    if (!entry) return;

    const validation = validateTriviaQuestionForm(
      entry.questionType,
      entry.draft,
      entry.config,
      entry.mediaUrl,
    );
    if (validation) {
      toastError("Invalid question", validation);
      return;
    }

    if (currentIndex < entries.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setStep("review");
    }
  };

  const handleSubmitAll = async () => {
    setSaving(true);
    try {
      for (const entry of entries) {
        const validation = validateTriviaQuestionForm(
          entry.questionType,
          entry.draft,
          entry.config,
          entry.mediaUrl,
        );
        if (validation) {
          toastError("Invalid question", validation);
          setSaving(false);
          return;
        }
        const payload = buildTriviaQuestionPayload(
          entry.questionType,
          entry.draft,
          entry.config,
          entry.mediaUrl,
        );
        await api(`/quizzes/${quizId}/questions`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onClose();
      await onAdded();
    } catch (e) {
      toastError(
        "Failed to add questions",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const currentEntry = entries[currentIndex];

  const stepTitle =
    step === "count"
      ? "Add bulk questions"
      : step === "questions"
        ? `Question ${currentIndex + 1} of ${entries.length}`
        : "Review questions";

  const stepDescription =
    step === "count"
      ? "How many questions do you want to add?"
      : step === "questions"
        ? "Choose a type and fill in each question, then continue to the next."
        : `Confirm ${entries.length} questions before adding them to this activity.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stepTitle}
      description={stepDescription}
      className="max-w-xl"
    >
      {step === "count" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Number of questions</label>
            <Input
              type="number"
              min={2}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={startQuestions}>Continue</Button>
          </div>
        </div>
      )}

      {step === "questions" && currentEntry && (
        <div className="space-y-4">
          <div className="flex gap-1">
            {entries.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= currentIndex ? "bg-primary" : "bg-foreground/10"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Question type</label>
              <Select
                className="w-full"
                value={currentEntry.questionType}
                onChange={(e) => handleTypeChange(e.target.value as TriviaQuestionType)}
              >
                {Object.entries(TRIVIA_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Time limit (sec)</label>
              <Input
                type="number"
                min={5}
                max={120}
                value={currentEntry.draft.timeLimitSec}
                onChange={(e) =>
                  updateEntry({
                    ...currentEntry,
                    draft: { ...currentEntry.draft, timeLimitSec: Number(e.target.value) },
                  })
                }
                className="w-24"
              />
            </div>
          </div>

          <TriviaQuestionFormFields
            questionType={currentEntry.questionType}
            draft={currentEntry.draft}
            config={currentEntry.config}
            mediaUrl={currentEntry.mediaUrl}
            onDraftChange={(draft) => updateEntry({ ...currentEntry, draft })}
            onConfigChange={(config) => updateEntry({ ...currentEntry, config })}
            onMediaUrlChange={(mediaUrl) => updateEntry({ ...currentEntry, mediaUrl })}
            onUploadFile={uploadFile}
            uploading={uploading}
          />

          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (currentIndex === 0) {
                  setStep("count");
                } else {
                  setCurrentIndex((i) => i - 1);
                }
              }}
              disabled={uploading}
            >
              Back
            </Button>
            <Button onClick={goNextQuestion} disabled={uploading}>
              {currentIndex < entries.length - 1 ? "Next question" : "Review"}
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <ol className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {entries.map((entry, i) => (
              <li key={i} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">
                  {i + 1}. {entry.draft.text.trim() || "(No text)"}
                  <span className="ml-2 font-normal text-muted-foreground">
                    · {entry.draft.timeLimitSec}s
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TRIVIA_TYPE_LABELS[entry.questionType]}
                </p>
                <p className="mt-1 text-muted-foreground">{summarizeEntry(entry)}</p>
              </li>
            ))}
          </ol>
          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStep("questions");
                setCurrentIndex(entries.length - 1);
              }}
              disabled={saving}
            >
              Back
            </Button>
            <Button onClick={handleSubmitAll} disabled={saving}>
              {saving ? "Adding…" : `Add ${entries.length} questions`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
