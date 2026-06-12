import { redirect } from "next/navigation";

export default async function LegacyPlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next ? `/login?next=${encodeURIComponent(next)}` : "/login?next=%2Ffg-admin";
  redirect(target);
}
