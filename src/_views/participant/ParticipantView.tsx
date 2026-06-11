"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TeamChat } from "@/components/chat/TeamChat";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { VotingPanel } from "@/components/voting/VotingPanel";
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
  const [tab, setTab] = useState<"chat" | "quiz" | "vote">("chat");

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
      <AppShell title={`Team ${user?.teamLetter ?? "?"}`} nav={participantNav} showSponsors>
        <div className="mb-6">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "chat", label: "Chat" },
              { value: "quiz", label: "Quiz" },
              { value: "vote", label: "Vote" },
            ]}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {tab === "chat" && user?.teamId && <TeamChat teamId={user.teamId} />}
            {tab === "quiz" && <QuizPlayer />}
            {tab === "vote" && <VotingPanel />}
          </div>
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
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
