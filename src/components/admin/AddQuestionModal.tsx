"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { QuestionFormFields } from "@/components/admin/QuestionFormFields";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { privateApi } from "@/lib/axios";
import { TRIVIA_TYPE_LABELS } from "@/lib/trivia/types";
import type { TriviaQuestionType } from "@/lib/trivia/types";
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
  const { api, path } = useEventApi();
  const [questionType, setQuestionType] = useState<TriviaQuestionType>("QUIZ");
  const [draft, setDraft] = useState<QuestionDraft>(emptyQuestionDraft());
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuestionType("QUIZ");
      setDraft(emptyQuestionDraft());
      setConfig({});
      setMediaUrl(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (questionType === "TRUE_FALSE") {
      setDraft((d) => ({ ...d, options: ["True", "False"] }));
    }
  }, [questionType]);

  const uploadMedia = async (file: File) => {
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
      setMediaUrl(res.data.asset.url);
      setConfig((c) => ({ ...c, mediaKey: res.data.asset.key }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = () => {
    const base = questionDraftToPayload(draft);
    let options = base.options;
    let correctIndex = base.correctIndex;
    const mergedConfig = { ...config };

    if (questionType === "TRUE_FALSE") {
      options = ["True", "False"];
    }
    if (questionType === "PUZZLE") {
      mergedConfig.items = options;
      mergedConfig.correctOrder = options.map((_, i) => i);
    }
    if (questionType === "TYPE_ANSWER") {
      mergedConfig.acceptedAnswers = options.length ? options : [draft.text];
      options = options.length ? options : ["answer"];
    }
    if (questionType === "SLIDER") {
      mergedConfig.min = mergedConfig.min ?? 0;
      mergedConfig.max = mergedConfig.max ?? 100;
      mergedConfig.correct = mergedConfig.correct ?? correctIndex;
      mergedConfig.tolerance = mergedConfig.tolerance ?? 2;
    }
    if (questionType === "PIN_ANSWER") {
      mergedConfig.pins = mergedConfig.pins ?? [{ x: 0.5, y: 0.5 }];
      mergedConfig.pinTolerance = mergedConfig.pinTolerance ?? 0.08;
    }

    return {
      type: questionType,
      text: base.text,
      options,
      correctIndex,
      config: mergedConfig,
      mediaUrl,
      timeLimitSec: base.timeLimitSec,
    };
  };

  const handleSubmit = async () => {
    if (questionType === "QUIZ" || questionType === "QUIZ_AUDIO" || questionType === "TRUE_FALSE") {
      const validation = validateQuestionDraft(draft);
      if (validation) {
        setError(validation);
        return;
      }
    } else if (!draft.text.trim()) {
      setError("Question text is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api(`/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify(buildPayload()),
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
        <Select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as TriviaQuestionType)}
        >
          {Object.entries(TRIVIA_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {(questionType === "PIN_ANSWER" || questionType === "QUIZ_AUDIO") && (
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              {questionType === "QUIZ_AUDIO" ? "Audio file" : "Image"}
            </span>
            <input
              type="file"
              accept={questionType === "QUIZ_AUDIO" ? "audio/*" : "image/*"}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadMedia(file);
              }}
            />
            {mediaUrl && <p className="mt-1 text-xs text-success">Uploaded</p>}
          </label>
        )}

        {questionType === "SLIDER" && (
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              placeholder="Min"
              onChange={(e) => setConfig((c) => ({ ...c, min: Number(e.target.value) }))}
            />
            <Input
              type="number"
              placeholder="Max"
              onChange={(e) => setConfig((c) => ({ ...c, max: Number(e.target.value) }))}
            />
            <Input
              type="number"
              placeholder="Correct"
              onChange={(e) => setConfig((c) => ({ ...c, correct: Number(e.target.value) }))}
            />
          </div>
        )}

        <QuestionFormFields
          draft={
            questionType === "TRUE_FALSE"
              ? { ...draft, options: ["True", "False"] }
              : draft
          }
          onChange={setDraft}
        />

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? "Adding…" : "Add question"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
