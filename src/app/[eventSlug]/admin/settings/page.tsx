import { Suspense } from "react";
import { SettingsView } from "@/_views/admin/settings/SettingsView";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
