import Link from "next/link";
import { LoginBrand } from "@/components/auth/LoginBrand";

interface LoginCardProps {
  title: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}

export function LoginCard({ title, backHref, backLabel, children }: LoginCardProps) {
  return (
    <div className="w-full">
      <LoginBrand />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back — enter your details to continue.</p>
      <div className="mt-8">{children}</div>
      <p className="mt-8 text-sm">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-muted-foreground transition hover:text-primary"
        >
          <span aria-hidden>←</span> {backLabel}
        </Link>
      </p>
    </div>
  );
}
