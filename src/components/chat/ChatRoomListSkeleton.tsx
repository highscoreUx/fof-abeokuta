"use client";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

export function ChatRoomListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1 px-2 py-1">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBar key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}
