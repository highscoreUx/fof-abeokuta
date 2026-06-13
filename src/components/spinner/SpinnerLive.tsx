"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useEventNav } from "@/hooks/useEventNav";
import { userCanAccessActivityInstance } from "@/lib/activities/catalog";
import { SpinnerWheel } from "@/components/spinner/SpinnerWheel";
import { SpinnerGraceResults } from "@/components/spinner/SpinnerFinishedResults";
import { useParticipantActivitiesRegistry } from "@/components/activities/participant-activities-registry";
import { useActivityCompletionGrace } from "@/hooks/useActivityCompletionGrace";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SpinnerStateSnapshot } from "@/lib/spinner/types";

interface SpinnerLiveProps {
  challengeId: string;
  initialSessionId?: string | null;
  compact?: boolean;
}

export function SpinnerLive({ challengeId, initialSessionId, compact = false }: SpinnerLiveProps) {
  const socket = useSocket();
  const { user } = useAuth();
  const { registerCompleted } = useParticipantActivitiesRegistry();
  const { homeActivities } = useEventNav();
  const [state, setState] = useState<SpinnerStateSnapshot | null>(null);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const lastSpinId = useRef<string | null>(null);
  const registeredSessionId = useRef<string | null>(null);

  const isCompleted = state?.state === "COMPLETED";
  const { inGracePeriod, graceExpired, graceRemainingMs, completedAt } =
    useActivityCompletionGrace(Boolean(isCompleted));

  useEffect(() => {
    if (!isCompleted || !state || !completedAt) return;
    if (registeredSessionId.current === state.sessionId) return;

    registeredSessionId.current = state.sessionId;
    registerCompleted({
      key: `spinner:${state.sessionId}`,
      type: "spinner",
      title: state.title,
      completedAt,
      sessionId: state.sessionId,
      snapshot: state,
    });
  }, [isCompleted, state, completedAt, registerCompleted]);

  useEffect(() => {
    if (!state || state.state === "COMPLETED") return;
    registeredSessionId.current = null;
  }, [state?.sessionId, state?.state]);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: SpinnerStateSnapshot) => {
      if (snapshot.challengeId !== challengeId) return;
      setState(snapshot);

      if (snapshot.lastSpin && snapshot.lastSpin.id !== lastSpinId.current) {
        lastSpinId.current = snapshot.lastSpin.id;
        setWheelSpinning(true);
      }
    };

    socket.on("spinner:state", onState);
    return () => {
      socket.off("spinner:state", onState);
    };
  }, [socket, challengeId]);

  useEffect(() => {
    if (!socket || !initialSessionId) return;
    socket.emit("spinner:join", initialSessionId);
  }, [socket, initialSessionId]);

  const canAccess =
    state &&
    user &&
    userCanAccessActivityInstance(user, {
      allowGeneralParticipants: state.allowGeneralParticipants,
      allowGroupParticipants: state.allowGroupParticipants,
    });

  const isActivePlayer =
    state?.participationMode === "CONCURRENT" ||
    (state?.participationMode === "ONE_AT_A_TIME" &&
      user &&
      (state.activeUserId ?? state.startedByUserId) === user.id);

  const canSpin = Boolean(state?.state === "ACTIVE" && canAccess && isActivePlayer);
  const isSpectator = Boolean(state?.state === "ACTIVE" && canAccess && !isActivePlayer);

  const startSession = () => {
    socket?.emit("spinner:session:start", challengeId);
  };

  const spin = () => {
    if (!state) return;
    socket?.emit("spinner:spin", state.sessionId);
  };

  const endSession = () => {
    if (!state) return;
    socket?.emit("spinner:session:end", state.sessionId);
  };

  if (!state) {
    if (initialSessionId) {
      return null;
    }

    return (
      <Card className={compact ? "p-4" : "p-6"}>
        <CardTitle>Spinner</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Start a live spinner session for your group.
        </p>
        <Button className="mt-4" onClick={startSession}>
          Start spinner
        </Button>
      </Card>
    );
  }

  if (state.state === "COMPLETED") {
    if (graceExpired) {
      return null;
    }

    return <SpinnerGraceResults snapshot={state} graceRemainingMs={graceRemainingMs} />;
  }

  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{state.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.teamLetter ? `Team ${state.teamLetter}` : "Whole event"}
            {state.participationMode === "ONE_AT_A_TIME" && state.activeUsername
              ? ` · ${state.activeUsername} can spin`
              : ""}
          </p>
        </div>
        {state.state === "ACTIVE" && isSpectator && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Spectating
          </span>
        )}
      </div>

      <div className="mt-6">
        <SpinnerWheel
          options={state.options}
          targetIndex={state.lastSpin?.selectedIndex ?? null}
          spinning={wheelSpinning}
          onSpinComplete={() => setWheelSpinning(false)}
        />
      </div>

      {state.lastSpin && (
        <div className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Latest result</p>
          <p className="mt-1 text-lg font-bold">{state.lastSpin.selectedOption}</p>
          <p className="text-xs text-muted-foreground">by {state.lastSpin.username}</p>
        </div>
      )}

      {state.spinHistory.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            History
          </p>
          <ul className="space-y-1 text-sm">
            {state.spinHistory
              .slice()
              .reverse()
              .slice(0, 5)
              .map((spin) => (
                <li key={spin.id} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{spin.username}</span> →{" "}
                  {spin.selectedOption}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {state.state === "ACTIVE" && canSpin && (
          <Button onClick={spin} disabled={wheelSpinning}>
            {wheelSpinning ? "Spinning…" : "Spin"}
          </Button>
        )}
        {state.state === "ACTIVE" && (canSpin || state.startedByUserId === user?.id) && (
          <Button variant="secondary" onClick={endSession}>
            End session
          </Button>
        )}
        {!compact && (
          <Link
            href={homeActivities}
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Open in Activities
          </Link>
        )}
      </div>
    </Card>
  );
}
