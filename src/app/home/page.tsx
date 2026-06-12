import { Suspense } from "react";
import { GuestHomeRedirect } from "@/components/auth/GuestHomeRedirect";
import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default async function HomePage() {
  return (
    <LatestEventScope>
      <GuestHomeRedirect>
        <Suspense fallback={null}>
          <ParticipantView />
        </Suspense>
      </GuestHomeRedirect>
    </LatestEventScope>
  );
}
