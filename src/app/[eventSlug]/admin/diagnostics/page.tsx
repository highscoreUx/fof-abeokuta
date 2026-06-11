import { redirect } from "next/navigation";

export default async function AdminDiagnosticsRedirect({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  redirect(`/${eventSlug}/admin/settings?tab=diagnostics`);
}
