"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { AgendaAdmin } from "@/components/admin/AgendaAdmin";
import { ParticipantChat } from "@/components/chat/ParticipantChat";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { canManageAgenda, hasAdminShellAccess } from "@/lib/permissions";
import { AgendaList } from "@/components/agenda/AgendaList";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function ParticipantView() {
  const { nav, participantNav } = useEventNav();
  const { api } = useEventApi();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;
  const manageAgenda = user ? canManageAgenda(user.permissions) : false;
  const [agenda, setAgenda] = useState<AgendaListItem[]>([]);
  const [presentItemId, setPresentItemId] = useState<string | null>(null);
  const [template, setTemplate] = useState<AgendaTemplateId>(DEFAULT_AGENDA_TEMPLATE);
  const [event, setEvent] = useState<AgendaEventMeta | undefined>();
  const [tab, setTab] = useState<"chat" | "agenda">("chat");
  const [openAddAgenda, setOpenAddAgenda] = useState<(() => void) | null>(null);

  const registerOpenAddAgenda = useCallback((openAdd: () => void) => {
    setOpenAddAgenda(() => openAdd);
  }, []);

  useEffect(() => {
    if (searchParams.get("tab") === "agenda") {
      setTab("agenda");
    }
  }, [searchParams]);

  useEffect(() => {
    if (manageAgenda) return;

    api<{
      items: AgendaListItem[];
      presentItemId?: string | null;
      template: AgendaTemplateId;
      event: AgendaEventMeta;
    }>("/agenda").then((d) => {
      setAgenda(d.items);
      setPresentItemId(d.presentItemId ?? null);
      setTemplate(d.template ?? DEFAULT_AGENDA_TEMPLATE);
      setEvent(d.event);
    });
  }, [api, manageAgenda]);

  return (
    <PermissionGuard permission="participant.home" allowAdminShell>
      <AppShell title="Home" nav={shellNav}>
        <div
          className={
            tab === "chat"
              ? "flex h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] flex-col items-start gap-2 overflow-hidden sm:h-[calc(100dvh-10rem)] sm:max-h-[calc(100dvh-10rem)] sm:gap-4 lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)]"
              : "w-full space-y-6"
          }
        >
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              className="shrink-0"
              value={tab}
              onChange={setTab}
              options={[
                { value: "chat", label: "Chat" },
                { value: "agenda", label: "Agenda" },
              ]}
            />
            {manageAgenda && tab === "agenda" && (
              <Button className="shrink-0" onClick={() => openAddAgenda?.()}>
                Add agenda item
              </Button>
            )}
          </div>
          {tab === "chat" && (
            <ParticipantChat className="min-h-0 min-w-0 w-full flex-1 overflow-hidden" />
          )}
          {tab === "agenda" &&
            (manageAgenda ? (
              <AgendaAdmin embedded onRegisterOpenAdd={registerOpenAddAgenda} />
            ) : (
              <Card>
                <CardHeader className="mb-4">
                  <CardTitle>Agenda</CardTitle>
                </CardHeader>
                <AgendaList
                  template={template}
                  items={agenda}
                  event={event}
                  presentItemId={presentItemId}
                  emptyMessage="Agenda will appear here when published."
                />
              </Card>
            ))}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
