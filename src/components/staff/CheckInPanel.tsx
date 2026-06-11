"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  teamLetter: string | null;
  checkedInAt: string | null;
}

export function CheckInPanel() {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recent, setRecent] = useState<UserRow[]>([]);

  const search = async () => {
    const data = await api<{ users: UserRow[] }>(
      `/users?q=${encodeURIComponent(query)}&role=PARTICIPANT`,
    );
    setUsers(data.users);
  };

  useEffect(() => {
    void search();
  }, [slug]);

  useEffect(() => {
    if (!socket) return;
    socket.on("checkin:updated", (user: UserRow) => {
      setRecent((prev) => [user, ...prev].slice(0, 10));
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, checkedInAt: user.checkedInAt } : u)),
      );
    });
    return () => {
      socket.off("checkin:updated");
    };
  }, [socket]);

  const checkIn = async (userId: string) => {
    await api(`/users/${userId}/check-in`, { method: "PATCH" });
    await search();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardTitle>Check In Attendees</CardTitle>
        <div className="mt-4 flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search}>Search</Button>
        </div>
        <div className="mt-4 space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.username} {user.teamLetter ? `• Team ${user.teamLetter}` : ""}
                </p>
              </div>
              {user.checkedInAt ? (
                <span className="text-sm text-green-600">Checked in</span>
              ) : (
                <Button size="sm" onClick={() => checkIn(user.id)}>
                  Check In
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>Recent Check-ins</CardTitle>
        <div className="mt-4 space-y-2">
          {recent.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent check-ins</p>
          )}
          {recent.map((user) => (
            <div key={user.id} className="rounded-lg bg-muted p-2 text-sm">
              {user.firstName} {user.lastName} — Team {user.teamLetter ?? "?"}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
