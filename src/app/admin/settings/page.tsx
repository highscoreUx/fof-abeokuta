import { Suspense } from "react";
import { LatestEventScope } from "@/components/event/LatestEventScope";
import { SettingsView } from "@/_views/admin/settings/SettingsView";

export default async function AdminSettingsPage() {
  return (
    <LatestEventScope>
      <Suspense fallback={null}>
        <SettingsView />
      </Suspense>
    </LatestEventScope>
  );
}
