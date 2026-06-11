import { redirect } from "next/navigation";

export default async function AdminGamesRedirect({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/admin/activities`);
}
