import { redirect } from "next/navigation";

export default async function AdminActivitiesRedirect({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/admin/games`);
}
