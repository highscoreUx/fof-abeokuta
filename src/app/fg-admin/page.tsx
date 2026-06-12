"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { EventActivitiesPanel } from "@/components/platform/EventActivitiesPanel";

export default function PlatformAdminPage() {
  const router = useRouter();
  const { admin, accessToken, clearAuth } = usePlatformAuthStore();
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  } | null>(null);
  const [adminForms, setAdminForms] = useState<
    Record<string, { firstName: string; lastName: string; loading: boolean }>
  >({});

  const load = () => {
    platformApiFetch<{ events: PlatformEvent[] }>("/api/fg-admin/events").then((d) =>
      setEvents(d.events),
    );
  };

  useEffect(() => {
    if (!accessToken) {
      platformApiFetch("/api/fg-admin/auth/refresh", { method: "POST" })
        .catch(() => router.replace("/fg-admin/login"));
    }
    load();
  }, [accessToken, router]);

  const createEvent = async () => {
    if (!title || !date || !adminFirstName.trim() || !adminLastName.trim()) return;
    setLoading(true);
    setCreatedCredentials(null);
    try {
      const result = await platformApiFetch<{
        event: PlatformEvent;
        adminUser?: PlatformCreatedEventUser;
        loginPath?: string;
      }>("/api/fg-admin/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          date: new Date(date).toISOString(),
          adminFirstName: adminFirstName.trim(),
          adminLastName: adminLastName.trim(),
        }),
      });
      if (result.adminUser && result.loginPath) {
        setCreatedCredentials({
          eventTitle: result.event.title,
          loginPath: result.loginPath,
          user: result.adminUser,
        });
      }
      setTitle("");
      setDescription("");
      setDate("");
      setAdminFirstName("");
      setAdminLastName("");
      load();
    } finally {
      setLoading(false);
    }
  };

  const createEventAdmin = async (event: PlatformEvent) => {
    const form = adminForms[event.id] ?? { firstName: "", lastName: "", loading: false };
    if (!form.firstName.trim() || !form.lastName.trim()) return;

    setAdminForms((prev) => ({
      ...prev,
      [event.id]: { ...form, loading: true },
    }));

    try {
      const result = await platformApiFetch<{
        user: PlatformCreatedEventUser;
        loginPath: string;
      }>(`/api/fg-admin/events/${event.id}/admin-user`, {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        }),
      });
      setCreatedCredentials({
        eventTitle: event.title,
        loginPath: result.loginPath,
        user: result.user,
      });
      setAdminForms((prev) => ({
        ...prev,
        [event.id]: { firstName: "", lastName: "", loading: false },
      }));
      load();
    } catch {
      setAdminForms((prev) => ({
        ...prev,
        [event.id]: { ...form, loading: false },
      }));
    }
  };

  const updateAdminForm = (
    eventId: string,
    field: "firstName" | "lastName",
    value: string,
  ) => {
    setAdminForms((prev) => ({
      ...prev,
      [eventId]: {
        firstName: field === "firstName" ? value : (prev[eventId]?.firstName ?? ""),
        lastName: field === "lastName" ? value : (prev[eventId]?.lastName ?? ""),
        loading: prev[eventId]?.loading ?? false,
      },
    }));
  };

  const updateStatus = async (id: string, status: "DRAFT" | "LIVE" | "ARCHIVED") => {
    await platformApiFetch(`/api/fg-admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  };

  const logout = async () => {
    await fetch("/api/fg-admin/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push("/fg-admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Friends of Figma Abeokuta</p>
            <h1 className="text-2xl font-bold">Platform Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{admin?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 p-6">
        {createdCredentials && (
          <Card className="border-primary/40 bg-primary/5">
            <CardTitle>Event admin credentials</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Share these with the event admin for <strong>{createdCredentials.eventTitle}</strong>.
              They sign in at{" "}
              <Link href={createdCredentials.loginPath} className="text-primary underline">
                {createdCredentials.loginPath}
              </Link>
              .
            </p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-mono font-semibold">{createdCredentials.user.username}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Password</dt>
                <dd className="font-mono font-semibold">{createdCredentials.user.password}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd>
                  {createdCredentials.user.firstName} {createdCredentials.user.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role</dt>
                <dd>{createdCredentials.user.eventUserRoleName}</dd>
              </div>
            </dl>
            <Button className="mt-4" variant="secondary" size="sm" onClick={() => setCreatedCredentials(null)}>
              Dismiss
            </Button>
          </Card>
        )}

        <Card>
          <CardTitle>Create Event</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Event slug is auto-generated from the title. An event admin account is created at the same time.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input
              className="sm:col-span-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <Input
              value={adminFirstName}
              onChange={(e) => setAdminFirstName(e.target.value)}
              placeholder="Event admin first name"
            />
            <Input
              value={adminLastName}
              onChange={(e) => setAdminLastName(e.target.value)}
              placeholder="Event admin last name"
            />
          </div>
          <Button
            className="mt-4"
            onClick={createEvent}
            disabled={loading || !title || !date || !adminFirstName.trim() || !adminLastName.trim()}
          >
            {loading ? "Creating..." : "Create Event & Admin"}
          </Button>
        </Card>

        <Card>
          <CardTitle>All Events</CardTitle>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="space-y-4 rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      /{event.slug} · {new Date(event.date).toLocaleDateString()} · {event.status}
                      {typeof event.userCount === "number" ? ` · ${event.userCount} users` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/${event.slug}/home`}>
                      <Button size="sm" variant="secondary">
                        Event Admin
                      </Button>
                    </Link>
                    <Link href={`/${event.slug}/login`}>
                      <Button size="sm" variant="ghost">
                        Login
                      </Button>
                    </Link>
                    {event.status !== "LIVE" && (
                      <Button size="sm" onClick={() => updateStatus(event.id, "LIVE")}>
                        Go Live
                      </Button>
                    )}
                    {event.status === "LIVE" && (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(event.id, "ARCHIVED")}>
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
                {event.userCount === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
                    <p className="text-sm font-medium">No event admin yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create the first event admin so someone can sign in at /{event.slug}/login.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Input
                        className="max-w-[10rem]"
                        value={adminForms[event.id]?.firstName ?? ""}
                        onChange={(e) => updateAdminForm(event.id, "firstName", e.target.value)}
                        placeholder="First name"
                      />
                      <Input
                        className="max-w-[10rem]"
                        value={adminForms[event.id]?.lastName ?? ""}
                        onChange={(e) => updateAdminForm(event.id, "lastName", e.target.value)}
                        placeholder="Last name"
                      />
                      <Button
                        size="sm"
                        onClick={() => createEventAdmin(event)}
                        disabled={
                          adminForms[event.id]?.loading ||
                          !adminForms[event.id]?.firstName?.trim() ||
                          !adminForms[event.id]?.lastName?.trim()
                        }
                      >
                        {adminForms[event.id]?.loading ? "Creating…" : "Create event admin"}
                      </Button>
                    </div>
                  </div>
                )}
                <EventActivitiesPanel eventId={event.id} />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
