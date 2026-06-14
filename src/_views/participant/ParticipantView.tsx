"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { AgendaAdmin } from "@/components/admin/AgendaAdmin";
import { ParticipantChat } from "@/components/chat/ParticipantChat";
import { GalleryPanel } from "@/components/gallery/GalleryPanel";
import { GalleryToolbarControls } from "@/components/gallery/GalleryToolbarControls";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useHasPermission } from "@/hooks/useHasPermission";
import { canManageAgenda, hasAdminShellAccess, hasPermission } from "@/lib/permissions";
import { AgendaList } from "@/components/agenda/AgendaList";
import { AgendaListSkeleton } from "@/components/agenda/AgendaListSkeleton";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { GalleryFilter } from "@/types/gallery";

type HomeTab = "agenda" | "chat" | "gallery";

export function ParticipantView() {
  const { nav, participantNav } = useEventNav();
  const { api } = useEventApi();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const canViewGallery = useHasPermission("gallery.view");
  const canViewChat = user ? hasPermission(user.permissions, "participant.chat") : false;
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;
  const manageAgenda = user ? canManageAgenda(user.permissions) : false;
  const [agenda, setAgenda] = useState<AgendaListItem[]>([]);
  const [presentItemId, setPresentItemId] = useState<string | null>(null);
  const [template, setTemplate] = useState<AgendaTemplateId>(DEFAULT_AGENDA_TEMPLATE);
  const [event, setEvent] = useState<AgendaEventMeta | undefined>();
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [tab, setTab] = useState<HomeTab>("agenda");
  const [openAddAgenda, setOpenAddAgenda] = useState<(() => void) | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("all");
  const [galleryTeam, setGalleryTeam] = useState<string | undefined>();

  const tabOptions = [
    { value: "agenda" as const, label: "Agenda" },
    ...(canViewChat ? [{ value: "chat" as const, label: "Chat" }] : []),
    ...(canViewGallery ? [{ value: "gallery" as const, label: "Gallery" }] : []),
  ];

  const registerOpenAddAgenda = useCallback((openAdd: () => void) => {
    setOpenAddAgenda(() => openAdd);
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "agenda" || tabParam === "chat" || tabParam === "gallery") {
      if (tabParam === "gallery" && !canViewGallery) return;
      if (tabParam === "chat" && !canViewChat) return;
      setTab(tabParam);
    }
  }, [searchParams, canViewGallery, canViewChat]);

  useEffect(() => {
    if (manageAgenda) return;

    setAgendaLoading(true);
    api<{
      items: AgendaListItem[];
      presentItemId?: string | null;
      template: AgendaTemplateId;
      event: AgendaEventMeta;
    }>("/agenda")
      .then((d) => {
        setAgenda(d.items);
        setPresentItemId(d.presentItemId ?? null);
        setTemplate(d.template ?? DEFAULT_AGENDA_TEMPLATE);
        setEvent(d.event);
      })
      .finally(() => setAgendaLoading(false));
  }, [api, manageAgenda]);

  return (
    <PermissionGuard permission="participant.home" allowAdminShell>
      <AppShell
        title="Home"
        nav={shellNav}
        contentClassName={tab === "gallery" ? "max-w-7xl" : undefined}
      >
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
              onChange={(value) => setTab(value as HomeTab)}
              options={tabOptions}
            />
            {manageAgenda && tab === "agenda" && (
              <Button className="shrink-0" onClick={() => openAddAgenda?.()}>
                Add agenda item
              </Button>
            )}
            {tab === "gallery" && canViewGallery && (
              <GalleryToolbarControls
                filter={galleryFilter}
                team={galleryTeam}
                onFilterChange={(filter, team) => {
                  setGalleryFilter(filter);
                  setGalleryTeam(team);
                }}
              />
            )}
          </div>
          {tab === "chat" && canViewChat && (
            <ParticipantChat className="min-h-0 min-w-0 w-full flex-1 overflow-hidden" />
          )}
          {tab === "gallery" && canViewGallery && (
            <GalleryPanel filter={galleryFilter} team={galleryTeam} />
          )}
          {tab === "agenda" &&
            (manageAgenda ? (
              <AgendaAdmin embedded onRegisterOpenAdd={registerOpenAddAgenda} />
            ) : agendaLoading ? (
              <Card>
                <CardHeader className="mb-4">
                  <CardTitle>Agenda</CardTitle>
                </CardHeader>
                <AgendaListSkeleton />
              </Card>
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
