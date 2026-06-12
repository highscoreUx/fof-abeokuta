import { LatestEventScope } from "@/components/event/LatestEventScope";

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  return <LatestEventScope>{children}</LatestEventScope>;
}
