import { LatestEventScope } from "@/components/event/LatestEventScope";
import { DiagnosticsView } from "@/_views/admin/diagnostics/DiagnosticsView";

export default async function AdminDiagnosticsPage() {
  return (
    <LatestEventScope>
      <DiagnosticsView />
    </LatestEventScope>
  );
}
