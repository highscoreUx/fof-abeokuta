import { redirect } from "next/navigation";

export default async function EventActivitiesRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventSlug } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString();
  redirect(
    suffix ? `/${eventSlug}/home/play?${suffix}` : `/${eventSlug}/home?tab=chat`,
  );
}
