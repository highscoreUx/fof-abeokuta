"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>System Diagnostics</CardTitle>
        <Button variant="secondary" size="sm" onClick={check}>Refresh</Button>
      </div>
      {health ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            Status:{" "}
            <span className={health.status === "healthy" ? "text-green-600" : "text-yellow-600"}>
              {health.status}
            </span>
          </p>
          <p>Database: {health.database.ok ? `OK (${health.database.latencyMs}ms)` : health.database.error}</p>
          <p>Socket clients: {health.socket.clients}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Unable to fetch health data</p>
      )}
    </Card>
  );
}
