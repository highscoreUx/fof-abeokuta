"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { UserImport } from "@/components/admin/UserImport";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { Card, CardTitle } from "@/components/ui/card";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  teamLetter: string | null;
  loginPhrase?: string | null;
  password?: string;
  checkedInAt: string | null;
}

export function UsersView() {
  const { nav } = useEventNav();
  const { api } = useEventApi();
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    api<{ users: UserRow[] }>("/users").then((d) => setUsers(d.users));
  }, [api]);

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="User Management" nav={nav}>
        <UserImport />
        <Card className="mt-6">
          <CardTitle>All Users ({users.length})</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-2">Name</th>
                  <th className="p-2">Username</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Team</th>
                  <th className="p-2">Password</th>
                  <th className="p-2">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="p-2">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="p-2 font-mono text-xs">{u.username}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.teamLetter ?? "—"}</td>
                    <td className="p-2 font-mono">{u.password ?? "—"}</td>
                    <td className="p-2">{u.checkedInAt ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AppShell>
    </RoleGuard>
  );
}
