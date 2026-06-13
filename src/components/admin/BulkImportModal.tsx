"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEventApi } from "@/hooks/useEventApi";
import { useInvalidateUsers } from "@/hooks/useUsersQuery";
import { useAuthStore } from "@/stores/authStore";

interface ImportSummaryRow {
  email: string;
  username: string;
  permissionProfile: string;
  emailQueued: boolean;
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function BulkImportModal({ open, onClose }: BulkImportModalProps) {
  const { path } = useEventApi();
  const invalidateUsers = useInvalidateUsers();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: Array<{ row: number; error: string }>;
    summary: ImportSummaryRow[];
  } | null>(null);

  const reset = () => {
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const importFile = async (file: File) => {
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("autoAssignTeams", "true");

    const token = useAuthStore.getState().accessToken;
    const response = await globalThis.fetch(path("/users/import"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    setResult({
      created: data.created ?? 0,
      errors: data.errors ?? [],
      summary: data.credentialSheet ?? [],
    });
    setLoading(false);
    void invalidateUsers();
  };

  const emailedCount = result?.summary.filter((row) => row.emailQueued).length ?? 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk add users"
      description="Upload a CSV or Excel file. Columns: email, username, firstName, lastName, middleName (optional), role, password (optional)."
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Each row needs a globally unique email and username. Temporary passwords are generated when
          omitted and emailed when SMTP and the queue are configured. Participants without email at
          import receive credentials when they check in and provide an email.
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:border-primary/40 hover:bg-muted/50">
          <span className="text-sm font-medium text-foreground">
            {loading ? "Importing…" : "Choose CSV or Excel file"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">.csv, .xlsx</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {result && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium text-foreground">Created {result.created} user(s)</p>
            {emailedCount > 0 && (
              <p className="mt-1 text-muted-foreground">
                Sign-in details emailed to {emailedCount} account(s).
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1 text-danger">
                {result.errors.map((e) => (
                  <p key={e.row}>
                    Row {e.row}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
