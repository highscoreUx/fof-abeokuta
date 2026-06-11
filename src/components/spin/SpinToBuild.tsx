"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useEventSlug } from "@/hooks/useEventSlug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

interface SpinState {
  challengeId: string;
  title: string;
  prompt?: string;
  state: string;
  submissions: Array<{ teamLetter: string; username: string; payload: Record<string, unknown> }>;
}

export function SpinToBuild({ admin = false }: { admin?: boolean }) {
  const eventSlug = useEventSlug();
  const socket = useSocket();
  const { user } = useAuth(eventSlug);
  const [state, setState] = useState<SpinState | null>(null);
  const [buildUrl, setBuildUrl] = useState("");

  useEffect(() => {
    if (!socket) return;
    socket.on("spin:state", setState);
    return () => {
      socket.off("spin:state", setState);
    };
  }, [socket]);

  const submit = () => {
    if (!state || !buildUrl.trim()) return;
    socket?.emit("spin:submit", {
      challengeId: state.challengeId,
      payload: { figmaUrl: buildUrl, submittedAt: new Date().toISOString() },
    });
    setBuildUrl("");
  };

  return (
    <div className="space-y-4">
      {admin && (
        <Card>
          <CardTitle>Spin-to-Build Admin</CardTitle>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => socket?.emit("spin:admin:start")}>Start Challenge</Button>
            {state?.challengeId && (
              <Button
                variant="secondary"
                onClick={() => socket?.emit("spin:admin:complete", state.challengeId)}
              >
                Complete
              </Button>
            )}
          </div>
        </Card>
      )}

      {state?.state === "ACTIVE" && (
        <Card>
          <CardTitle>{state.title}</CardTitle>
          <p className="mt-2 text-lg font-medium text-primary">{state.prompt}</p>
          {!admin && user?.teamLetter && (
            <div className="mt-4 flex gap-2">
              <Input
                value={buildUrl}
                onChange={(e) => setBuildUrl(e.target.value)}
                placeholder="Figma file URL..."
              />
              <Button onClick={submit}>Submit Build</Button>
            </div>
          )}
        </Card>
      )}

      {state?.submissions && state.submissions.length > 0 && (
        <Card>
          <CardTitle>Submissions</CardTitle>
          <div className="mt-4 space-y-2">
            {state.submissions.map((s, i) => (
              <div key={i} className="rounded-lg bg-foreground/5 p-3 text-sm">
                Team {s.teamLetter} — {s.username}
                <pre className="mt-1 text-xs">{JSON.stringify(s.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
