"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { MOBILE_BOTTOM_TAB_ICONS } from "@/components/layout/MobileBottomTabBar";
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
import {
  AgendaMobileHeader,
  AgendaNativeList,
  AgendaNativeSkeleton,
} from "@/components/agenda/AgendaNativeList";
import type { AgendaEventMeta, AgendaListItem } from "@/components/agenda/types";
import { DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useChatStore } from "@/stores/chatStore";
import type { GalleryFilter } from "@/types/gallery";

type HomeTab = "agenda" | "chat" | "gallery";

function resolveHomeTab(
  searchParams: ReturnType<typeof useSearchParams>,
  canViewChat: boolean,
  canViewGallery: boolean,
): HomeTab {
  const tabParam = searchParams.get("tab");
  if (tabParam === "chat" && canViewChat) return "chat";
  if (tabParam === "gallery" && canViewGallery) return "gallery";
  if (tabParam === "agenda") return "agenda";
  return canViewChat ? "chat" : "agenda";
}

export function ParticipantView() {
  const { nav, participantNav, home } = useEventNav();
  const router = useRouter();
  const { api } = useEventApi();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const mobilePane = useChatStore((state) => state.mobilePane);
  const setMobilePane = useChatStore((state) => state.setMobilePane);
  const canViewGallery = useHasPermission("gallery.view");
  const canViewChat = user ? hasPermission(user.permissions, "participant.chat") : false;
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;
  const manageAgenda = user ? canManageAgenda(user.permissions) : false;
  const [agenda, setAgenda] = useState<AgendaListItem[]>([]);
  const [presentItemId, setPresentItemId] = useState<string | null>(null);
  const [template, setTemplate] = useState<AgendaTemplateId>(DEFAULT_AGENDA_TEMPLATE);
  const [event, setEvent] = useState<AgendaEventMeta | undefined>();
  const [agendaLoading, setAgendaLoading] = useState(true);
  const tab = resolveHomeTab(searchParams, canViewChat, canViewGallery);
  const [openAddAgenda, setOpenAddAgenda] = useState<(() => void) | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("all");
  const [galleryTeam, setGalleryTeam] = useState<string | undefined>();

  const inChatThread = tab === "chat" && mobilePane === "chat";

  const tabOptions = [
    { value: "agenda" as const, label: "Agenda" },
    ...(canViewChat ? [{ value: "chat" as const, label: "Chat" }] : []),
    ...(canViewGallery ? [{ value: "gallery" as const, label: "Gallery" }] : []),
  ];

  const mobileBottomTabs = useMemo(() => {
    const options: HomeTab[] = [
      "agenda",
      ...(canViewChat ? (["chat"] as const) : []),
      ...(canViewGallery ? (["gallery"] as const) : []),
    ];
    return options.map((value) => {
      const Icon = MOBILE_BOTTOM_TAB_ICONS[value];
      const label = value.charAt(0).toUpperCase() + value.slice(1);
      return {
        value,
        label,
        href: `${home}?tab=${value}`,
        icon: <Icon active={tab === value} />,
      };
    });
  }, [canViewChat, canViewGallery, home, tab]);

  const setTabWithUrl = useCallback(
    (next: HomeTab) => {
      router.replace(`${home}?tab=${next}`, { scroll: false });
    },
    [home, router],
  );

  const registerOpenAddAgenda = useCallback((openAdd: () => void) => {
    setOpenAddAgenda(() => openAdd);
  }, []);

  useEffect(() => {
    if (tab !== "chat") {
      setMobilePane("list");
    }
  }, [tab, setMobilePane]);

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
        mobileBottomTabs={mobileBottomTabs}
        activeBottomTab={tab}
        hideMobileTitle
        hideMobileHeader={tab === "chat" || tab === "agenda"}
        hideMobileBottomTabs={inChatThread}
        mobileEdgeToEdge={tab === "chat" || tab === "agenda"}
      >
        <div
          className={cn(
            tab === "chat" || tab === "agenda"
              ? "flex h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden lg:h-auto lg:max-h-none"
              : "w-full space-y-4 px-1 lg:space-y-6 lg:px-0",
            tab === "chat" && "lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)]",
            inChatThread && "h-[100dvh] max-h-[100dvh] lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)]",
          )}
        >
          {/* Desktop tab switcher + shared actions */}
          <div className="hidden w-full flex-wrap items-center justify-between gap-3 lg:flex">
            <SegmentedControl
              className="shrink-0"
              value={tab}
              onChange={(value) => setTabWithUrl(value as HomeTab)}
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

          {/* Mobile gallery header */}
          {tab === "gallery" && canViewGallery && (
            <div className="flex items-center justify-between gap-3 px-1 lg:hidden">
              <h2 className="text-[28px] font-bold tracking-tight text-foreground">Gallery</h2>
              <GalleryToolbarControls
                filter={galleryFilter}
                team={galleryTeam}
                onFilterChange={(filter, team) => {
                  setGalleryFilter(filter);
                  setGalleryTeam(team);
                }}
              />
            </div>
          )}

          {canViewChat && (
            <div
              className={cn(
                "min-h-0 min-w-0 w-full flex-1 overflow-hidden",
                tab !== "chat" && "hidden",
              )}
            >
              <ParticipantChat className="h-full" />
            </div>
          )}

          {tab === "gallery" && canViewGallery && (
            <GalleryPanel filter={galleryFilter} team={galleryTeam} />
          )}

          {tab === "agenda" &&
            (manageAgenda ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:block lg:flex-none">
                <AgendaAdmin embedded onRegisterOpenAdd={registerOpenAddAgenda} />
              </div>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col lg:hidden">
                  <AgendaMobileHeader event={event} />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                    {agendaLoading ? (
                      <AgendaNativeSkeleton />
                    ) : (
                      <AgendaNativeList
                        items={agenda}
                        presentItemId={presentItemId}
                        emptyMessage="Agenda will appear here when published."
                      />
                    )}
                  </div>
                </div>
                <div className="hidden lg:block">
                  {agendaLoading ? (
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
                  )}
                </div>
              </>
            ))}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
