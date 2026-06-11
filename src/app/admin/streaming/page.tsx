import { redirect } from "next/navigation";

export default function AdminStreamingRedirect() {
  redirect("/admin/settings?tab=broadcasting");
}
