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
  email: string | null;
  maskedEmail?: string | null;
  needsEmail?: boolean;
  username: string;
  teamLetter: string | null;
  checkedInAt: string | null;
}

function displayEmail(user: UserRow): string {
  return user.email ?? user.maskedEmail ?? "Not set yet";
}

export function CheckInPanel() {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recent, setRecent] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [checkInError, setCheckInError] = useState("");

  const search = async () => {
    const data = await api<{ data: UserRow[] }>(
      `/users?q=${encodeURIComponent(query)}&role=PARTICIPANT&limit=25`,
    );
    setUsers(data.data);
    if (selected && !data.data.some((u) => u.id === selected.id)) {
      setSelected(null);
    }
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
      if (selected?.id === user.id) {
        setSelected((prev) => (prev ? { ...prev, checkedInAt: user.checkedInAt } : null));
      }
    });
    return () => {
      socket.off("checkin:updated");
    };
  }, [socket, selected?.id]);

  const selectUser = (user: UserRow) => {
    setSelected(user);
    setEmailInput("");
    setCheckInError("");
  };

  const checkIn = async (user: UserRow) => {
    setCheckInError("");
    const needsEmail = user.needsEmail ?? !user.email;
    try {
      const result = await api<{ user: UserRow }>(`/users/${user.id}/check-in`, {
        method: "PATCH",
        body: JSON.stringify(needsEmail ? { email: emailInput.trim() } : {}),
      });
      setSelected((prev) => ({ ...(prev?.id === user.id ? prev : user), ...result.user }));
      await search();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Failed to check in");
    }
  };

  const uncheckIn = async (user: UserRow) => {
    const result = await api<{ user: UserRow }>(`/users/${user.id}/check-in`, { method: "DELETE" });
    setSelected((prev) => (prev ? { ...prev, ...result.user } : result.user));
    await search();
  };

  const selectedNeedsEmail = selected ? (selected.needsEmail ?? !selected.email) : false;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardTitle>Welcome attendees</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Search by name, confirm their email, then check them in so they can sign in.
        </p>
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
              className={`flex items-center justify-between rounded-lg border p-3 ${
                selected?.id === user.id ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div>
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.teamLetter ? `Team ${user.teamLetter}` : "Team pending check-in"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => selectUser(user)}>
                  Show login
                </Button>
                {user.checkedInAt ? (
                  <Button size="sm" variant="outline" onClick={() => void uncheckIn(user)}>
                    Undo
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => selectUser(user)}>
                    Check in
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardTitle>Login details to share</CardTitle>
          {selected ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Tell <span className="font-medium text-foreground">{selected.firstName}</span> to sign
                in with their email and the temporary password shared at registration.
              </p>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                {selectedNeedsEmail && !selected.checkedInAt ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email (required)
                    </p>
                    {selected.maskedEmail && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ticket: <span className="font-mono">{selected.maskedEmail}</span>
                      </p>
                    )}
                    <Input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Ask attendee for email"
                      className="mt-2"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-primary">
                      {displayEmail(selected)}
                    </p>
                  </>
                )}
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Username
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                  {selected.username}
                </p>
              </div>
              {checkInError && <p className="text-sm text-danger">{checkInError}</p>}
              {selected.checkedInAt ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600">Checked in — they can sign in now.</p>
                  <Button size="sm" variant="outline" onClick={() => void uncheckIn(selected)}>
                    Undo check-in
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => void checkIn(selected)}>
                  Check in
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Select an attendee to confirm their sign-in details.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Recent check-ins</CardTitle>
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
    </div>
  );
}
