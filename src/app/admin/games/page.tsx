import { redirect } from "next/navigation";

export default function AdminGamesRedirect() {
  redirect("/admin/activities");
}
