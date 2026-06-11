import { LatestEventScope } from "@/components/event/LatestEventScope";
import { StreamingView } from "@/_views/admin/streaming/StreamingView";

export default async function AdminStreamingPage() {
  return (
    <LatestEventScope>
      <StreamingView />
    </LatestEventScope>
  );
}
