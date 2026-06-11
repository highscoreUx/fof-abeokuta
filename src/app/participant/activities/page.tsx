import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ParticipantActivitiesView } from "@/_views/participant/activities/ParticipantActivitiesView";

export default async function ParticipantActivitiesPage() {
  return (
    <LatestEventScope>
      <ParticipantActivitiesView />
    </LatestEventScope>
  );
}
