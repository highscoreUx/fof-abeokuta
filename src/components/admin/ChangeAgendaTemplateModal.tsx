"use client";

import { useEffect, useState } from "react";
import { AgendaList } from "@/components/agenda/AgendaList";
import type { AgendaListItem } from "@/components/agenda/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  AGENDA_TEMPLATES,
  DEFAULT_AGENDA_TEMPLATE,
  type AgendaTemplateId,
} from "@/lib/agenda-templates";
import { useEventApi } from "@/hooks/useEventApi";

const PREVIEW_ITEMS: AgendaListItem[] = [
  {
    id: "preview-1",
    title: "Opening keynote",
    description: "Welcome and event overview.",
    startTime: "2026-06-10T09:00:00.000Z",
    endTime: "2026-06-10T09:45:00.000Z",
  },
  {
    id: "preview-2",
    title: "Team breakout",
    description: "Work in groups on the challenge.",
    startTime: "2026-06-10T10:00:00.000Z",
    endTime: "2026-06-10T12:00:00.000Z",
  },
];

const PREVIEW_EVENT = {
  title: "Friends of Figma",
  date: "2026-06-10T09:00:00.000Z",
};

interface ChangeAgendaTemplateModalProps {
  open: boolean;
  onClose: () => void;
  currentTemplate: AgendaTemplateId;
  onSaved?: (template: AgendaTemplateId) => void;
}

export function ChangeAgendaTemplateModal({
  open,
  onClose,
  currentTemplate,
  onSaved,
}: ChangeAgendaTemplateModalProps) {
  const { api } = useEventApi();
  const [selected, setSelected] = useState<AgendaTemplateId>(currentTemplate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(currentTemplate);
      setError("");
    }
  }, [open, currentTemplate]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ agendaTemplate: selected }),
      });
      onSaved?.(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change agenda template"
      description="Pick how the schedule looks for admins and participants. Notebook is the default."
      className="max-w-6xl"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENDA_TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelected(template.id)}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{template.name}</span>
                {template.id === DEFAULT_AGENDA_TEMPLATE && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    Default
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{template.description}</p>
              <div className="pointer-events-none max-h-52 overflow-hidden rounded-lg border border-border bg-muted/20 p-2">
                <div className="origin-top-left scale-[0.62] sm:scale-[0.72]">
                  <AgendaList
                    template={template.id}
                    items={PREVIEW_ITEMS}
                    event={PREVIEW_EVENT}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Apply template"}
        </Button>
      </div>
    </Modal>
  );
}
