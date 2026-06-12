import { LatestEventScope } from "@/components/event/LatestEventScope";
import { AdminShellLayout } from "@/components/layout/AdminShellLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LatestEventScope>
      <AdminShellLayout>{children}</AdminShellLayout>
    </LatestEventScope>
  );
}
