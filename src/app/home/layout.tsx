import { LatestEventScope } from "@/components/event/LatestEventScope";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  return <LatestEventScope>{children}</LatestEventScope>;
}
