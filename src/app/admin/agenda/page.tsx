import { LatestEventScope } from "@/components/event/LatestEventScope";
import { AgendaView } from "@/_views/admin/agenda/AgendaView";

export default async function AdminAgendaPage() {
  return (
    <LatestEventScope>
      <AgendaView />
    </LatestEventScope>
  );
}
