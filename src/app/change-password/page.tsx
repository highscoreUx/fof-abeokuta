import { ChangePasswordView } from "@/_views/change-password/ChangePasswordView";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const { token, next } = await searchParams;

  return <ChangePasswordView token={token ?? ""} next={next ?? null} />;
}
