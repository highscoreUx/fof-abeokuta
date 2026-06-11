import { LatestEventScope } from "@/components/event/LatestEventScope";
import { SettingsView } from "@/_views/admin/settings/SettingsView";

export default async function AdminSettingsPage() {
  return (
    <LatestEventScope>
      <SettingsView />
    </LatestEventScope>
  );
}
