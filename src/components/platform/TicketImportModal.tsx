"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { platformApiUpload } from "@/lib/platform-api-client";
import { toastError } from "@/lib/toast";

interface TicketImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  skippedRows: Array<{ row: number; reason: string }>;
}

interface TicketImportModalProps {
  open: boolean;
  eventId: string;
  onClose: () => void;
  onImported: () => void;
}

export function TicketImportModal({ open, eventId, onClose, onImported }: TicketImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketImportSummary | null>(null);
  const blockBackdropCloseRef = useRef(false);

  const reset = () => {
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const guardBackdropClose = () => {
    if (blockBackdropCloseRef.current) return;
    handleClose();
  };

  const armBackdropGuard = () => {
    blockBackdropCloseRef.current = true;
    window.setTimeout(() => {
      blockBackdropCloseRef.current = false;
    }, 500);
  };

  useEffect(() => {
    if (!open) return;
    const onWindowFocus = () => armBackdropGuard();
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [open]);

  const importFile = async (file: File) => {
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await platformApiUpload<TicketImportSummary>(
        `/api/fg-admin/events/${eventId}/users/import-tickets`,
        formData,
      );
      setResult(data);
      onImported();
    } catch (err) {
      toastError(
        "Import failed",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
      armBackdropGuard();
    }
  };

  return (
    <Modal
      open={open}
      onClose={guardBackdropClose}
      title="Import ticket registrations"
      description="Upload a Figma ticket export CSV. Participants are matched across events by name and masked email pattern — no real email required until check-in."
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Expected columns: Order number, Ticket number, First Name, Last Name, Email (masked), Paid
          by (name). Re-uploading the same file updates existing ticket rows safely.
        </p>
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:border-primary/40 hover:bg-muted/50"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            armBackdropGuard();
          }}
        >
          <span className="text-sm font-medium text-foreground">
            {loading ? "Importing…" : "Choose CSV or Excel file"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">.csv, .xlsx</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              armBackdropGuard();
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {result && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium text-foreground">
              Created {result.created} · Updated {result.updated} · Skipped {result.skipped}
            </p>
            {result.skippedRows.length > 0 && (
              <div className="mt-2 space-y-1 text-muted-foreground">
                {result.skippedRows.slice(0, 5).map((row) => (
                  <p key={row.row}>
                    Row {row.row}: {row.reason}
                  </p>
                ))}
                {result.skippedRows.length > 5 && (
                  <p>…and {result.skippedRows.length - 5} more skipped rows</p>
                )}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1 text-danger">
                {result.errors.map((e) => (
                  <p key={`${e.row}-${e.error}`}>
                    {e.row > 0 ? `Row ${e.row}: ` : ""}
                    {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
