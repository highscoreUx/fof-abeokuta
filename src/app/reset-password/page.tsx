import { ResetPasswordView } from "@/_views/reset-password/ResetPasswordView";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordView token={token ?? ""} />;
}
