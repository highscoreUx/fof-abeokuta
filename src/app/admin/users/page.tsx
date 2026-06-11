import { LatestEventScope } from "@/components/event/LatestEventScope";
import { UsersView } from "@/_views/admin/users/UsersView";

export default async function AdminUsersPage() {
  return (
    <LatestEventScope>
      <UsersView />
    </LatestEventScope>
  );
}
