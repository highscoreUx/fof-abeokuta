"use client";

import { useCallback, useEffect, useState } from "react";
import { AgendaItemModal } from "@/components/admin/AgendaItemModal";
import { ChangeAgendaTemplateModal } from "@/components/admin/ChangeAgendaTemplateModal";
import { AgendaList } from "@/components/agenda/AgendaList";
import { AgendaListSkeleton } from "@/components/agenda/AgendaListSkeleton";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { AGENDA_TEMPLATES, DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";

interface AgendaAdminProps {
  /** Hides the header toolbar — use with an external Add button (e.g. Home agenda tab). */
  embedded?: boolean;
  onRegisterOpenAdd?: (openAdd: () => void) => void;
}

export function AgendaAdmin({ embedded = false, onRegisterOpenAdd }: AgendaAdminProps) {
  const { slug, api } = useEventApi();
  const [items, setItems] = useState<AgendaListItem[]>([]);
  const [presentItemId, setPresentItemId] = useState<string | null>(null);
  const [template, setTemplate] = useState<AgendaTemplateId>(DEFAULT_AGENDA_TEMPLATE);
  const [event, setEvent] = useState<AgendaEventMeta | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaListItem | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const d = await api<{
          items: AgendaListItem[];
          presentItemId?: string | null;
          template: AgendaTemplateId;
          event: AgendaEventMeta;
        }>("/agenda");
        setItems(d.items);
        setPresentItemId(d.presentItemId ?? null);
        setTemplate(d.template ?? DEFAULT_AGENDA_TEMPLATE);
        setEvent(d.event);
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void load();
  }, [slug, load]);

  const remove = async (id: string) => {
    await api(`/agenda/${id}`, { method: "DELETE" });
    await load(true);
  };

  const setPresent = async (item: AgendaListItem) => {
    await api(`/agenda/${item.id}/present`, { method: "POST" });
    await load(true);
  };

  const clearPresent = async (item: AgendaListItem) => {
    await api(`/agenda/${item.id}/present`, {
      method: "POST",
      body: JSON.stringify({ clear: true }),
    });
    await load(true);
  };

  const openAdd = useCallback(() => {
    setEditingItem(null);
    setFormOpen(true);
  }, []);

  const openEdit = (item: AgendaListItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingItem(null);
  };

  useEffect(() => {
    onRegisterOpenAdd?.(openAdd);
  }, [onRegisterOpenAdd, openAdd]);

  const templateName =
    AGENDA_TEMPLATES.find((entry) => entry.id === template)?.name ?? "Notebook";

  if (loading) {
    return <AgendaListSkeleton showHeader={!embedded} />;
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Event schedule ({items.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Template: {templateName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTemplateOpen(true)}>
              Change template
            </Button>
            <Button onClick={openAdd}>Add agenda item</Button>
          </div>
        </div>
      )}

      <AgendaList
        template={template}
        items={items}
        event={event}
        presentItemId={presentItemId}
        onEdit={openEdit}
        onDelete={remove}
        onSetPresent={setPresent}
        onClearPresent={clearPresent}
      />

      <AgendaItemModal
        open={formOpen}
        onClose={closeForm}
        item={editingItem}
        onSaved={load}
      />
      <ChangeAgendaTemplateModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        currentTemplate={template}
        onSaved={setTemplate}
      />
    </div>
  );
}
