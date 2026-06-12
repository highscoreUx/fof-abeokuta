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
import { TRIVIA_TYPE_LABELS } from "@/lib/trivia/types";
import type { TriviaQuestionType } from "@/lib/trivia/types";
import {
  buildTriviaQuestionPayload,
  defaultFormStateForType,
  validateTriviaQuestionForm,
} from "@/lib/trivia/question-form-defaults";
import type { QuestionDraft } from "@/lib/quiz-question-form";

interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  quizId: string;
  onAdded: () => Promise<void>;
}

export function AddQuestionModal({ open, onClose, quizId, onAdded }: AddQuestionModalProps) {
  const { api, path } = useEventApi();
  const [questionType, setQuestionType] = useState<TriviaQuestionType>("QUIZ");
  const [draft, setDraft] = useState<QuestionDraft>(defaultFormStateForType("QUIZ").draft);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const resetForType = (type: TriviaQuestionType) => {
    const defaults = defaultFormStateForType(type);
    setDraft(defaults.draft);
    setConfig(defaults.config);
    setMediaUrl(null);
    setError(null);
  };

  useEffect(() => {
    if (!open) {
      setQuestionType("QUIZ");
      resetForType("QUIZ");
    }
  }, [open]);

  const handleTypeChange = (type: TriviaQuestionType) => {
    setQuestionType(type);
    resetForType(type);
  };

  const uploadMedia = async (file: File) => {
    setUploading(true);
    setError(null);
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

  const handleSubmit = async () => {
    const validation = validateTriviaQuestionForm(questionType, draft, config, mediaUrl);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = buildTriviaQuestionPayload(questionType, draft, config, mediaUrl);
      await api(`/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onClose();
      await onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  const needsMediaUpload =
    questionType === "PIN_ANSWER" || questionType === "QUIZ_AUDIO";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add single question"
      description="Create one trivia question for this activity."
      className="max-w-xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Question type</label>
            <Select
              className="w-full"
              value={questionType}
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
              value={draft.timeLimitSec}
              onChange={(e) =>
                setDraft((d) => ({ ...d, timeLimitSec: Number(e.target.value) }))
              }
              className="w-24"
            />
          </div>
        </div>

        {needsMediaUpload && (
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
            {mediaUrl && questionType === "QUIZ_AUDIO" && (
              <audio controls src={mediaUrl} className="mt-2 w-full" />
            )}
            {mediaUrl && questionType === "PIN_ANSWER" && (
              <p className="mt-1 text-xs text-success">Image uploaded — set pin below</p>
            )}
          </label>
        )}

        <TriviaQuestionFormFields
          questionType={questionType}
          draft={draft}
          config={config}
          mediaUrl={mediaUrl}
          onDraftChange={setDraft}
          onConfigChange={setConfig}
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
