import { redirect } from "next/navigation";

export default async function AdminStreamingRedirect({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/admin/settings?tab=broadcasting`);
}
