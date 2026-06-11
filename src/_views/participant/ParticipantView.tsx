"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { ParticipantChat } from "@/components/chat/ParticipantChat";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { hasAdminShellAccess } from "@/lib/permissions";
import { AgendaList } from "@/components/agenda/AgendaList";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function ParticipantView() {
  const { nav, participantNav } = useEventNav();
  const { api } = useEventApi();
  const { user } = useAuth();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;
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
    <PermissionGuard permission="participant.home" allowAdminShell>
      <AppShell title="Home" nav={shellNav}>
        <div
          className={
            tab === "chat"
              ? "flex h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] flex-col items-start gap-2 overflow-hidden sm:h-[calc(100dvh-10rem)] sm:max-h-[calc(100dvh-10rem)] sm:gap-4 lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)]"
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
            <ParticipantChat className="min-h-0 min-w-0 w-full flex-1 overflow-hidden" />
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
