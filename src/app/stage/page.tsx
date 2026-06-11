import { LatestEventScope } from "@/components/event/LatestEventScope";
import { StageView } from "@/_views/stage/StageView";

export default async function StagePage() {
  return (
    <LatestEventScope>
      <StageView />
    </LatestEventScope>
  );
}
