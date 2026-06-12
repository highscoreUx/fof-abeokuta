import { redirect } from "next/navigation";

export default async function LegacyEventLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { eventSlug } = await params;
  const { next } = await searchParams;
  const returnTo = next ?? `/${eventSlug}/home`;
  redirect(`/login?next=${encodeURIComponent(returnTo)}`);
}
