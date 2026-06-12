import { LatestEventScope } from "@/components/event/LatestEventScope";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  return <LatestEventScope>{children}</LatestEventScope>;
}
