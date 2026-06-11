import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ActivitiesView } from "@/_views/admin/activities/ActivitiesView";

export default async function AdminActivitiesPage() {
  return (
    <LatestEventScope>
      <ActivitiesView />
    </LatestEventScope>
  );
}
