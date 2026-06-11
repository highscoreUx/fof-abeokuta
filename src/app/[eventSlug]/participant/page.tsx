import { redirect } from "next/navigation";

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/home`);
}
