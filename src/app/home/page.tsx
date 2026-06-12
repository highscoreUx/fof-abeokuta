import { Suspense } from "react";
import { EventSessionGate } from "@/components/auth/EventSessionGate";
import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default async function HomePage() {
  return (
    <LatestEventScope>
      <EventSessionGate>
        <Suspense fallback={null}>
          <ParticipantView />
        </Suspense>
      </EventSessionGate>
    </LatestEventScope>
  );
}
