import { LatestEventScope } from "@/components/event/LatestEventScope";
import { ScoringView } from "@/_views/judge/scoring/ScoringView";

export default async function JudgeScoringPage() {
  return (
    <LatestEventScope>
      <ScoringView />
    </LatestEventScope>
  );
}
