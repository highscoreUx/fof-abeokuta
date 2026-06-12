import { redirect } from "next/navigation";
import { getLatestEvent } from "@/lib/events";

export default async function NotRegisteredPage() {
  const event = await getLatestEvent();
  if (!event) redirect("/login");
  redirect(`/${event.slug}/not-registered`);
}
