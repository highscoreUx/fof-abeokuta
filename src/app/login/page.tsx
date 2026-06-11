import { LatestEventScope } from "@/components/event/LatestEventScope";
import { LoginView } from "@/_views/login/LoginView";

export default async function LoginPage() {
  return (
    <LatestEventScope>
      <LoginView />
    </LatestEventScope>
  );
}
