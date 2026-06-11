import { redirect } from "next/navigation";

export default function AdminDiagnosticsRedirect() {
  redirect("/admin/settings?tab=diagnostics");
}
