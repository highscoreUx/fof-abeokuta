import { LatestEventScope } from "@/components/event/LatestEventScope";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LatestEventScope>{children}</LatestEventScope>;
}
