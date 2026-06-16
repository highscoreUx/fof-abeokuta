import { redirect } from "next/navigation";

export default function ParticipantActivitiesPage() {
  redirect("/home?tab=chat");
}
