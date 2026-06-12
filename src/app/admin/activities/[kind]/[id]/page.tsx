import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ActivityConfigureView } from "@/_views/admin/activities/ActivityConfigureView";

export default async function ActivityConfigurePage() {
  return (
    <LatestEventScope>
      <ActivityConfigureView />
    </LatestEventScope>
  );
}
