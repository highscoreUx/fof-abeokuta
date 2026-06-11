export function LoginBrand() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold tracking-tight text-primary-foreground">
        FOF
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-secondary" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-foreground">Friends of Figma</p>
        <p className="text-xs text-muted-foreground">Abeokuta</p>
      </div>
    </div>
  );
}
