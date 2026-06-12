import { Suspense } from "react";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default async function HomePage() {
  return (
    <Suspense fallback={null}>
      <ParticipantView />
    </Suspense>
  );
}
