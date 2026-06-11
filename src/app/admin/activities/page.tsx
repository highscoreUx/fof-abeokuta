import { redirect } from "next/navigation";

export default function AdminActivitiesRedirect() {
  redirect("/admin/games");
}
