"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fgAdminEventPath } from "@/lib/fg-admin-routes";
import { platformApiFetch } from "@/lib/platform-api-client";
import { toastError } from "@/lib/toast";
import type { PlatformDashboardStats } from "@/types/platform-dashboard";

const CHART_COLORS = {
  live: "#059669",
  draft: "#64748b",
  archived: "#ea580c",
  primary: "#236DF6",
  secondary: "#ea580c",
};

function formatShortDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  if (status === "LIVE") return <Badge variant="success">Live</Badge>;
  if (status === "ARCHIVED") return <Badge variant="secondary">Archived</Badge>;
  return <Badge variant="muted">Draft</Badge>;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color?: string }>;
  label?: string;
  valueLabel: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {valueLabel}: <span className="font-semibold text-foreground">{payload[0]?.value ?? 0}</span>
      </p>
    </div>
  );
}

export function PlatformDashboard() {
  const [data, setData] = useState<PlatformDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const stats = await platformApiFetch<PlatformDashboardStats>("/api/fg-admin/dashboard");
      setData(stats);
    } catch (err) {
      toastError(
        "Failed to load dashboard",
        err instanceof Error ? err.message : undefined,
      );
      setData(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (loadFailed || !data) {
    return (
      <Card className="py-12 text-center">
        <CardTitle>Could not load dashboard</CardTitle>
        <CardDescription className="mt-2">Try again in a moment.</CardDescription>
        <Button className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </Card>
    );
  }

  const { summary } = data;
  const pieColors = [CHART_COLORS.live, CHART_COLORS.draft, CHART_COLORS.archived];
  const registrationChart = data.registrationTrend.map((row) => ({
    ...row,
    label: formatShortDate(row.date),
  }));
  const checkInChart = data.checkInTrend.map((row) => ({
    ...row,
    label: formatShortDate(row.date),
  }));
  const topEventsChart = data.topEventsByParticipants.map((event) => ({
    name: event.title.length > 18 ? `${event.title.slice(0, 18)}…` : event.title,
    participants: event.participantCount,
    slug: event.slug,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total events" value={summary.totalEvents} hint={`${summary.liveEvents} live`} />
        <StatCard
          label="Participants"
          value={summary.totalParticipants.toLocaleString()}
          hint={`${summary.checkInRate}% checked in`}
        />
        <StatCard
          label="Checked in"
          value={summary.checkedInParticipants.toLocaleString()}
          hint={`of ${summary.totalParticipants.toLocaleString()} registered`}
        />
        <StatCard label="Global staff" value={summary.globalStaff} hint={`${summary.totalAccounts} accounts`} />
        <StatCard label="Teams" value={summary.totalTeams.toLocaleString()} />
        <StatCard label="Quizzes" value={summary.totalQuizzes.toLocaleString()} />
        <StatCard label="Votes" value={summary.totalVotes.toLocaleString()} />
        <StatCard label="Chat messages" value={summary.totalMessages.toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Events by status</CardTitle>
            <CardDescription>Live, draft, and archived events across the platform.</CardDescription>
          </CardHeader>
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.eventsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {data.eventsByStatus.map((entry, index) => (
                    <Cell key={entry.status} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrations (30 days)</CardTitle>
            <CardDescription>New event participants added per day.</CardDescription>
          </CardHeader>
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={registrationChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip content={<ChartTooltip valueLabel="Registrations" />} />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check-ins (30 days)</CardTitle>
            <CardDescription>Participants checked in per day.</CardDescription>
          </CardHeader>
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={checkInChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip content={<ChartTooltip valueLabel="Check-ins" />} />
                <Bar dataKey="checkIns" fill={CHART_COLORS.live} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top events by size</CardTitle>
            <CardDescription>Events with the most registered participants.</CardDescription>
          </CardHeader>
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEventsChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={96} />
                <Tooltip content={<ChartTooltip valueLabel="Participants" />} />
                <Bar dataKey="participants" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-border px-6 py-5">
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Latest activity across the platform.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Participants
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Checked in
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Teams
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No events yet. Create your first event to get started.
                  </td>
                </tr>
              )}
              {data.recentEvents.map((event) => (
                <tr key={event.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={fgAdminEventPath(event.slug)}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">/{event.slug}</p>
                  </td>
                  <td className="px-4 py-3">{statusBadge(event.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(event.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">{event.participantCount.toLocaleString()}</td>
                  <td className="px-4 py-3">{event.checkedInCount.toLocaleString()}</td>
                  <td className="px-4 py-3">{event.teamCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(event.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
