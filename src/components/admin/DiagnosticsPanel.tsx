"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthData {
  status: string;
  database: { ok: boolean; latencyMs?: number; error?: string };
  socket: { clients: number };
  timestamp: string;
}

export function DiagnosticsPanel() {
  const { slug, api } = useEventApi();
  const [health, setHealth] = useState<HealthData | null>(null);

  const check = () => {
    api<HealthData>("/health").then(setHealth).catch(() => setHealth(null));
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>System diagnostics</CardTitle>
          <CardDescription>Live health checks for this event environment.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={check}>
          Refresh
        </Button>
      </CardHeader>
      {health ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="mt-2">
              <Badge variant={health.status === "healthy" ? "success" : "secondary"}>
                {health.status}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Database</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {health.database.ok ? `OK (${health.database.latencyMs}ms)` : health.database.error}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sockets</p>
            <p className="mt-2 text-sm font-medium text-foreground">{health.socket.clients} clients</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Unable to fetch health data</p>
      )}
    </Card>
  );
}
