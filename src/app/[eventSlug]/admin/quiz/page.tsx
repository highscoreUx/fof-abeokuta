import { redirect } from "next/navigation";

export default async function AdminQuizRedirect({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/admin/games`);
}
