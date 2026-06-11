"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";

interface Sponsor {
  label: string;
  position: "BOTTOM_LEFT" | "BOTTOM_RIGHT";
}

export function SponsorBars() {
  const { slug, api } = useEventApi();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    api<{ sponsors: Sponsor[] }>("/settings")
      .then((data) => setSponsors(data.sponsors))
      .catch(() => {});
  }, [slug]);

  const left = sponsors.find((s) => s.position === "BOTTOM_LEFT");
  const right = sponsors.find((s) => s.position === "BOTTOM_RIGHT");

  return (
    <>
      {left && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
          {left.label}
        </div>
      )}
      {right && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {right.label}
        </div>
      )}
    </>
  );
}
