"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { QuestionFormFields } from "@/components/admin/QuestionFormFields";
import { useEventApi } from "@/hooks/useEventApi";
import {
  emptyQuestionDraft,
  questionDraftToPayload,
  validateQuestionDraft,
  type QuestionDraft,
} from "@/lib/quiz-question-form";

interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  quizId: string;
  onAdded: () => Promise<void>;
}

export function AddQuestionModal({ open, onClose, quizId, onAdded }: AddQuestionModalProps) {
  const { api } = useEventApi();
  const [draft, setDraft] = useState<QuestionDraft>(emptyQuestionDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(emptyQuestionDraft());
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const validation = validateQuestionDraft(draft);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api(`/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify(questionDraftToPayload(draft)),
      });
      onClose();
      await onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add single question"
      description="Create one trivia question for this activity."
      className="max-w-xl"
    >
      <div className="space-y-3">
        <QuestionFormFields draft={draft} onChange={setDraft} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Adding…" : "Add question"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
