import { redirect } from "next/navigation";

export default function AdminVotingRedirect() {
  redirect("/admin/settings");
}
