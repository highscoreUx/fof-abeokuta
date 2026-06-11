import { LatestEventScope } from "@/components/event/LatestEventScope";
import { CustomizeView } from "@/_views/admin/customize/CustomizeView";

export default async function AdminCustomizePage() {
  return (
    <LatestEventScope>
      <CustomizeView />
    </LatestEventScope>
  );
}
