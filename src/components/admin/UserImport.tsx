"use client";

import { useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function UserImport() {
  const { slug, path, api } = useEventApi();
  const [result, setResult] = useState<{
    created: number;
    errors: Array<{ row: number; error: string }>;
    pinSheet: Array<{ username: string; pin: string; role: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const importFile = async (file: File, autoAssignTeams: boolean) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("autoAssignTeams", String(autoAssignTeams));

    const token = useAuthStore.getState().accessToken;
    const response = await globalThis.fetch(path("/users/import"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  const assignTeams = async () => {
    await api("/users/assign-teams", { method: "POST", body: JSON.stringify({}) });
  };

  const downloadPinSheet = () => {
    if (!result?.pinSheet) return;
    const csv = ["username,pin,role", ...result.pinSheet.map((r) => `${r.username},${r.pin},${r.role}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-pin-sheet.csv`;
    a.click();
  };

  return (
    <Card>
      <CardTitle>Bulk User Import</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        CSV columns: firstName, lastName, middleName, role, pin (optional)
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <span className="inline-flex rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            {loading ? "Importing..." : "Upload CSV"}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file, true);
            }}
          />
        </label>
        <Button variant="secondary" onClick={assignTeams}>
          Re-assign Teams (F/I/G/M/A)
        </Button>
        {result?.pinSheet?.length ? (
          <Button variant="secondary" onClick={downloadPinSheet}>
            Download PIN Sheet
          </Button>
        ) : null}
      </div>
      {result && (
        <div className="mt-4 text-sm">
          <p>Created: {result.created}</p>
          {result.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              {result.errors.map((e) => (
                <p key={e.row}>Row {e.row}: {e.error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
