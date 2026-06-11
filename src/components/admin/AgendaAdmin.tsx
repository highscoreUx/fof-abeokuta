"use client";

import { useEffect, useState } from "react";
import { AddAgendaModal } from "@/components/admin/AddAgendaModal";
import { AgendaNotebookList } from "@/components/agenda/AgendaNotebookList";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
}

export function AgendaAdmin() {
  const { slug, api } = useEventApi();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => api<{ items: AgendaItem[] }>("/agenda").then((d) => setItems(d.items));

  useEffect(() => {
    load();
  }, [slug]);

  const remove = async (id: string) => {
    await api(`/agenda/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Event schedule ({items.length})
        </h2>
        <Button onClick={() => setAddOpen(true)}>Add agenda item</Button>
      </div>

      <AgendaNotebookList items={items} onDelete={remove} />

      <AddAgendaModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </div>
  );
}
