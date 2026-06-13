import { redirect } from "next/navigation";
import { FG_ADMIN_DASHBOARD } from "@/lib/fg-admin-routes";

export default function FgAdminIndexPage() {
  redirect(FG_ADMIN_DASHBOARD);
}
