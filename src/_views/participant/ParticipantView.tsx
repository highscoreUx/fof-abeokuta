"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TeamChat } from "@/components/chat/TeamChat";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { AgendaNotebookList } from "@/components/agenda/AgendaNotebookList";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
}

export function ParticipantView() {
  const { participantNav } = useEventNav();
  const { api } = useEventApi();
  const { user } = useAuth();
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [tab, setTab] = useState<"chat" | "quiz" | "vote">("chat");

  useEffect(() => {
    api<{ items: AgendaItem[] }>("/agenda").then((d) => setAgenda(d.items));
  }, [api]);

  return (
    <RoleGuard minimumRole="PARTICIPANT">
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
            <AgendaNotebookList
              items={agenda}
              emptyMessage="Agenda will appear here when published."
            />
          </Card>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
