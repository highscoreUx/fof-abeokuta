"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SpinnerLive } from "@/components/spinner/SpinnerLive";
import { useEventApi } from "@/hooks/useEventApi";
import { Card, CardTitle } from "@/components/ui/card";

interface SpinnerInstance {
  id: string;
  title: string;
  activeSessionId?: string | null;
  config?: { options?: string[] };
}

export function SpinnerActivitiesPanel() {
  const { api } = useEventApi();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("spinner");
  const focusSession = searchParams.get("session");
  const [instances, setInstances] = useState<SpinnerInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<{ challenges: SpinnerInstance[] }>("/spin-challenges")
      .then((d) => setInstances(d.challenges))
      .catch(() => setInstances([]))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading spinners…</p>;
  }

  if (instances.length === 0) {
    return (
      <Card className="p-6">
        <CardTitle>Spinner</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">No spinner activities available yet.</p>
      </Card>
    );
  }

  const ordered = focusId
    ? [...instances].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    : instances;

  return (
    <div className="space-y-6">
      {ordered.map((instance) => (
        <SpinnerLive
          key={instance.id}
          challengeId={instance.id}
          initialSessionId={
            instance.id === focusId ? focusSession ?? instance.activeSessionId : instance.activeSessionId
          }
        />
      ))}
    </div>
  );
}
