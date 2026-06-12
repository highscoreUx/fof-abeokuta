import { redirect } from "next/navigation";
import { FG_ADMIN_DIAGNOSTICS } from "@/lib/fg-admin-routes";

export default async function AdminDiagnosticsRedirect() {
  redirect(FG_ADMIN_DIAGNOSTICS);
}
