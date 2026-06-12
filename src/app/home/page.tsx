import { Suspense } from "react";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ParticipantView />
    </Suspense>
  );
}
