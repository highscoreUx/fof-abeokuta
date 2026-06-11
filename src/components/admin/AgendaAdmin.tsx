"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const load = () => api<{ items: AgendaItem[] }>("/agenda").then((d) => setItems(d.items));

  useEffect(() => {
    load();
  }, [slug]);

  const create = async () => {
    if (!title || !startTime || !endTime) return;
    await api("/agenda", {
      method: "POST",
      body: JSON.stringify({ title, description, startTime, endTime }),
    });
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    load();
  };

  const remove = async (id: string) => {
    await api(`/agenda/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <Card>
      <CardTitle>Agenda</CardTitle>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </div>
      <Button className="mt-3" onClick={create}>Add Item</Button>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.startTime).toLocaleString()} – {new Date(item.endTime).toLocaleString()}
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={() => remove(item.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
