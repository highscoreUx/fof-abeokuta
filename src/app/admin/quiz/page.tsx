import { redirect } from "next/navigation";

export default function AdminQuizRedirect() {
  redirect("/admin/activities");
}
