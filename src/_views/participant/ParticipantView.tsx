"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { ParticipantChat } from "@/components/chat/ParticipantChat";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { AgendaList } from "@/components/agenda/AgendaList";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function ParticipantView() {
  const { participantNav } = useEventNav();
  const { api } = useEventApi();
  const { user } = useAuth();
  const [agenda, setAgenda] = useState<AgendaListItem[]>([]);
  const [template, setTemplate] = useState<AgendaTemplateId>(DEFAULT_AGENDA_TEMPLATE);
  const [event, setEvent] = useState<AgendaEventMeta | undefined>();
  const [tab, setTab] = useState<"chat" | "agenda">("chat");

  useEffect(() => {
    api<{
      items: AgendaListItem[];
      template: AgendaTemplateId;
      event: AgendaEventMeta;
    }>("/agenda").then((d) => {
      setAgenda(d.items);
      setTemplate(d.template ?? DEFAULT_AGENDA_TEMPLATE);
      setEvent(d.event);
    });
  }, [api]);

  return (
    <PermissionGuard permission="participant.home">
      <AppShell title={`Team ${user?.teamLetter ?? "?"}`} nav={participantNav}>
        <div
          className={
            tab === "chat"
              ? "flex h-[calc(100dvh-11rem)] max-h-[calc(100dvh-11rem)] flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-10rem)] sm:max-h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)]"
              : "space-y-6"
          }
        >
          <SegmentedControl
            className="shrink-0"
            value={tab}
            onChange={setTab}
            options={[
              { value: "chat", label: "Chat" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
          {tab === "chat" && (
            <ParticipantChat className="min-h-0 flex-1 overflow-hidden" />
          )}
          {tab === "agenda" && (
            <Card>
              <CardHeader className="mb-4">
                <CardTitle>Agenda</CardTitle>
              </CardHeader>
              <AgendaList
                template={template}
                items={agenda}
                event={event}
                emptyMessage="Agenda will appear here when published."
              />
            </Card>
          )}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
