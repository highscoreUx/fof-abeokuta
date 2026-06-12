import { Suspense } from "react";
import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default function HomePage() {
  return (
    <LatestEventScope>
      <Suspense fallback={null}>
        <ParticipantView />
      </Suspense>
    </LatestEventScope>
  );
}
