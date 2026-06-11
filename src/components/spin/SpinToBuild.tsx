"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { userCanAccessActivityInstance } from "@/lib/activities/catalog";
import { ACTIVITY_SPIN_TO_BUILD } from "@/lib/activities/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

interface ActivityConfig {
  slug: string;
  allowGeneral: boolean;
  allowGroup: boolean;
}

interface SpinState {
  challengeId: string;
  title: string;
  prompt?: string;
  state: string;
  allowGeneralParticipants?: boolean;
  allowGroupParticipants?: boolean;
  submissions: Array<{ teamLetter: string; username: string; payload: Record<string, unknown> }>;
}

export function SpinToBuild({ admin = false }: { admin?: boolean }) {
  const { api } = useEventApi();
  const socket = useSocket();
  const { user } = useAuth();
  const [state, setState] = useState<SpinState | null>(null);
  const [buildUrl, setBuildUrl] = useState("");
  const [activityConfig, setActivityConfig] = useState<ActivityConfig | null>(null);
  const [allowGeneral, setAllowGeneral] = useState(false);
  const [allowGroup, setAllowGroup] = useState(true);

  useEffect(() => {
    if (!admin) return;
    api<{ activities: ActivityConfig[] }>("/activities")
      .then((d) => {
        const config = d.activities.find((a) => a.slug === ACTIVITY_SPIN_TO_BUILD) ?? null;
        setActivityConfig(config);
        if (config?.allowGroup && !config.allowGeneral) {
          setAllowGroup(true);
          setAllowGeneral(false);
        }
      })
      .catch(() => setActivityConfig(null));
  }, [admin, api]);

  useEffect(() => {
    if (!socket) return;
    socket.on("spin:state", setState);
    return () => {
      socket.off("spin:state", setState);
    };
  }, [socket]);

  const startSession = () => {
    socket?.emit("spin:admin:start", {
      allowGeneralParticipants: allowGeneral,
      allowGroupParticipants: allowGroup,
    });
  };

  const submit = () => {
    if (!state || !buildUrl.trim()) return;
    socket?.emit("spin:submit", {
      challengeId: state.challengeId,
      payload: { figmaUrl: buildUrl, submittedAt: new Date().toISOString() },
    });
    setBuildUrl("");
  };

  const canParticipate =
    state &&
    user &&
    userCanAccessActivityInstance(user, {
      allowGeneralParticipants: Boolean(state.allowGeneralParticipants),
      allowGroupParticipants: Boolean(state.allowGroupParticipants),
    });

  return (
    <div className="space-y-4">
      {admin && (
        <Card>
          <CardTitle>Spin to Build</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a timed design challenge for participants.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Who can participate?</p>
              <div className="flex flex-wrap gap-4">
                {activityConfig?.allowGeneral && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowGeneral}
                      onChange={(e) => setAllowGeneral(e.target.checked)}
                    />
                    Whole event
                  </label>
                )}
                {activityConfig?.allowGroup && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowGroup}
                      onChange={(e) => setAllowGroup(e.target.checked)}
                    />
                    Team scoped
                  </label>
                )}
              </div>
              {allowGroup && (
                <p className="text-xs text-muted-foreground">
                  Each team participates separately. All teams with assigned members can join.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={startSession}>Start activity</Button>
              {state?.challengeId && (
                <Button
                  variant="secondary"
                  onClick={() => socket?.emit("spin:admin:complete", state.challengeId)}
                >
                  Complete
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {state?.state === "ACTIVE" && (admin || canParticipate) && (
        <Card>
          <CardTitle>{state.title}</CardTitle>
          <p className="mt-2 text-lg font-medium text-primary">{state.prompt}</p>
          {!admin && canParticipate && user?.teamLetter && (
            <div className="mt-4 flex gap-2">
              <Input
                value={buildUrl}
                onChange={(e) => setBuildUrl(e.target.value)}
                placeholder="Figma file URL..."
              />
              <Button onClick={submit}>Submit build</Button>
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
