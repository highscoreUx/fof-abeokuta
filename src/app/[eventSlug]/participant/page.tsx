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
import { Card, CardTitle } from "@/components/ui/card";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
}

export default function ParticipantPage() {
  const { slug, participantNav } = useEventNav();
  const { api } = useEventApi();
  const { user } = useAuth(slug);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [tab, setTab] = useState<"chat" | "quiz" | "vote">("chat");

  useEffect(() => {
    api<{ items: AgendaItem[] }>("/agenda").then((d) => setAgenda(d.items));
  }, [slug]);

  return (
    <RoleGuard minimumRole="PARTICIPANT">
      <AppShell title={`Team ${user?.teamLetter ?? "?"}`} nav={participantNav} showSponsors>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {(["chat", "quiz", "vote"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg border px-4 py-2 capitalize ${
                tab === t ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {tab === "chat" && user?.teamId && <TeamChat teamId={user.teamId} />}
            {tab === "quiz" && <QuizPlayer />}
            {tab === "vote" && <VotingPanel />}
          </div>
          <Card>
            <CardTitle>Agenda</CardTitle>
            <div className="mt-4 space-y-3">
              {agenda.map((item) => (
                <div key={item.id} className="rounded-lg bg-muted p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.startTime).toLocaleTimeString()} –{" "}
                    {new Date(item.endTime).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
