import { LatestEventScope } from "@/components/event/LatestEventScope";
import { CheckInView } from "@/_views/staff/check-in/CheckInView";

export default async function StaffCheckInPage() {
  return (
    <LatestEventScope>
      <CheckInView />
    </LatestEventScope>
  );
}
