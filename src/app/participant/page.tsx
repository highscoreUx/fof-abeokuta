import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default async function ParticipantPage() {
  return (
    <LatestEventScope>
      <ParticipantView />
    </LatestEventScope>
  );
}
