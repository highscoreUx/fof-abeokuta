"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { privateApi } from "@/lib/axios";
import { downloadQuizCsvTemplate } from "@/lib/quiz-csv-template";

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

interface SpreadsheetImportModalProps {
  open: boolean;
  onClose: () => void;
  quizId: string;
  onImported: () => Promise<void>;
}

export function SpreadsheetImportModal({
  open,
  onClose,
  quizId,
  onImported,
}: SpreadsheetImportModalProps) {
  const { path } = useEventApi();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setUploadProgress(null);
      setError(null);
      setUploading(false);
    }
  }, [open]);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploadProgress(0);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    const token = useAuthStore.getState().accessToken;

    try {
      await privateApi.post(path(`/quizzes/${quizId}/questions`), formData, {
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
      await onImported();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add bulk questions from spreadsheet"
      description="Upload a CSV or Excel file filled in from the bulk template."
      className="max-w-lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use the bulk template to add many questions at once. Columns: question, option1–4,
          correctIndex, timeLimitSec.
        </p>
        <Button variant="secondary" onClick={() => downloadQuizCsvTemplate()}>
          Download bulk template
        </Button>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center transition hover:bg-muted/50">
          <span className="text-sm font-medium">
            {uploading ? "Uploading…" : "Choose spreadsheet file"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">CSV or XLSX</span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        {uploadProgress !== null && (
          <div className="space-y-1">
            <ProgressBar value={uploadProgress} />
            <p className="text-xs text-muted-foreground">
              {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : "Processing…"}
            </p>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
