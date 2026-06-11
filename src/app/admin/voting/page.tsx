import { LatestEventScope } from "@/components/event/LatestEventScope";
import { VotingView } from "@/_views/admin/voting/VotingView";

export default async function AdminVotingPage() {
  return (
    <LatestEventScope>
      <VotingView />
    </LatestEventScope>
  );
}
