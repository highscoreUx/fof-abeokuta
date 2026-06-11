import { LatestEventScope } from "@/components/event/LatestEventScope";
import { AdminView } from "@/_views/admin/AdminView";

export default async function AdminPage() {
  return (
    <LatestEventScope>
      <AdminView />
    </LatestEventScope>
  );
}
