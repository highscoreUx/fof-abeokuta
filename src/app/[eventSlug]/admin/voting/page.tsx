import { redirect } from "next/navigation";

export default async function AdminVotingRedirect({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/admin/settings?tab=voting`);
}
