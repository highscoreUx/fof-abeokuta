"use client";

import { useEffect, useState } from "react";
import { AgendaItemModal } from "@/components/admin/AgendaItemModal";
import { ChangeAgendaTemplateModal } from "@/components/admin/ChangeAgendaTemplateModal";
import { AgendaList } from "@/components/agenda/AgendaList";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { AGENDA_TEMPLATES, DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";

export function AgendaAdmin() {
  const { slug, api } = useEventApi();
  const [items, setItems] = useState<AgendaListItem[]>([]);
  const [template, setTemplate] = useState<AgendaTemplateId>(DEFAULT_AGENDA_TEMPLATE);
  const [event, setEvent] = useState<AgendaEventMeta | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaListItem | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = () =>
    api<{ items: AgendaListItem[]; template: AgendaTemplateId; event: AgendaEventMeta }>(
      "/agenda",
    ).then((d) => {
      setItems(d.items);
      setTemplate(d.template ?? DEFAULT_AGENDA_TEMPLATE);
      setEvent(d.event);
    });

  useEffect(() => {
    load();
  }, [slug]);

  const remove = async (id: string) => {
    await api(`/agenda/${id}`, { method: "DELETE" });
    await load();
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: AgendaListItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingItem(null);
  };

  const templateName =
    AGENDA_TEMPLATES.find((entry) => entry.id === template)?.name ?? "Notebook";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

      <AgendaList
        template={template}
        items={items}
        event={event}
        onEdit={openEdit}
        onDelete={remove}
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
