"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionFormFields } from "@/components/admin/QuestionFormFields";
import { useEventApi } from "@/hooks/useEventApi";
import {
  emptyQuestionDraft,
  questionDraftToPayload,
  validateQuestionDraft,
  type QuestionDraft,
} from "@/lib/quiz-question-form";
import { toastError } from "@/lib/toast";

interface BulkAddQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  quizId: string;
  onAdded: () => Promise<void>;
}

type WizardStep = "count" | "questions" | "review";

export function BulkAddQuestionsModal({
  open,
  onClose,
  quizId,
  onAdded,
}: BulkAddQuestionsModalProps) {
  const { api } = useEventApi();
  const [step, setStep] = useState<WizardStep>("count");
  const [count, setCount] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep("count");
    setCount(3);
    setCurrentIndex(0);
    setDrafts([]);
    setSaving(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const startQuestions = () => {
    if (count < 2 || count > 50) {
      toastError("Invalid count", "Enter between 2 and 50 questions.");
      return;
    }
    setDrafts(Array.from({ length: count }, () => emptyQuestionDraft()));
    setCurrentIndex(0);
    setStep("questions");
  };

  const updateDraft = (draft: QuestionDraft) => {
    setDrafts((prev) => prev.map((item, i) => (i === currentIndex ? draft : item)));
  };

  const goNextQuestion = () => {
    const validation = validateQuestionDraft(drafts[currentIndex]);
    if (validation) {
      toastError("Invalid question", validation);
      return;
    }
    if (currentIndex < drafts.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setStep("review");
    }
  };

  const handleSubmitAll = async () => {
    setSaving(true);
    try {
      for (const draft of drafts) {
        const validation = validateQuestionDraft(draft);
        if (validation) {
          toastError("Invalid question", validation);
          setSaving(false);
          return;
        }
        await api(`/quizzes/${quizId}/questions`, {
          method: "POST",
          body: JSON.stringify(questionDraftToPayload(draft)),
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

  const stepTitle =
    step === "count"
      ? "Add bulk questions"
      : step === "questions"
        ? `Question ${currentIndex + 1} of ${drafts.length}`
        : "Review questions";

  const stepDescription =
    step === "count"
      ? "How many questions do you want to add?"
      : step === "questions"
        ? "Fill in each question, then continue to the next."
        : `Confirm ${drafts.length} questions before adding them to this activity.`;

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

      {step === "questions" && drafts[currentIndex] && (
        <div className="space-y-4">
          <div className="flex gap-1">
            {drafts.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= currentIndex ? "bg-primary" : "bg-foreground/10"
                }`}
              />
            ))}
          </div>
          <QuestionFormFields draft={drafts[currentIndex]} onChange={updateDraft} />
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
            >
              Back
            </Button>
            <Button onClick={goNextQuestion}>
              {currentIndex < drafts.length - 1 ? "Next question" : "Review"}
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <ol className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {drafts.map((draft, i) => {
              const options = draft.options.map((o) => o.trim()).filter(Boolean);
              return (
                <li key={i} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">
                    {i + 1}. {draft.text.trim()}
                    <span className="ml-2 font-normal text-muted-foreground">
                      · {draft.timeLimitSec}s
                    </span>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Correct: {options[draft.correctIndex] ?? "—"}
                  </p>
                </li>
              );
            })}
          </ol>
          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStep("questions");
                setCurrentIndex(drafts.length - 1);
              }}
              disabled={saving}
            >
              Back
            </Button>
            <Button onClick={handleSubmitAll} disabled={saving}>
              {saving ? "Adding…" : `Add ${drafts.length} questions`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
