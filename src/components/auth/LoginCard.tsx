import { LoginBrand } from "@/components/auth/LoginBrand";

interface LoginCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function LoginCard({ title, subtitle, children }: LoginCardProps) {
  return (
    <div className="w-full">
      <LoginBrand />
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}
