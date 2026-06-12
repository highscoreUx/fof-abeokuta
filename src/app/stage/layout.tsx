import { LatestEventScope } from "@/components/event/LatestEventScope";

export default async function StageLayout({ children }: { children: React.ReactNode }) {
  return <LatestEventScope>{children}</LatestEventScope>;
}
