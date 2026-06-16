"use client";

import Link from "next/link";
import { useEventNav } from "@/hooks/useEventNav";
import type { ActivityChatBody } from "@/lib/activity-chat-types";
import { officialActivityPlayHref } from "@/lib/activity-play-routes";
import { Button } from "@/components/ui/button";

interface ChatActivityCardProps {
  activity: ActivityChatBody;
}

export function ChatActivityCard({ activity }: ChatActivityCardProps) {
  const { home } = useEventNav();
  const isLive = activity.status === "live";
  const href = officialActivityPlayHref(home, activity);
  const spectateHref = officialActivityPlayHref(home, activity, { spectate: true });

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {activity.kind === "kahoot"
          ? "Live Trivia"
          : activity.kind === "tic_tac_toe"
            ? "Team Tic-Tac-Toe"
            : activity.kind === "hangman"
              ? "Team Hangman"
              : activity.kind === "countdown"
                ? "Countdown timer"
                : "Spinner"}
        {isLive ? " · Live" : " · Ended"}
      </p>
      <p className="mt-1 font-semibold">{activity.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{activity.text}</p>
      {isLive && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activity.kind === "kahoot" ? (
            <>
              <Link href={href}>
                <Button size="sm">Join</Button>
              </Link>
              <Link href={spectateHref}>
                <Button size="sm" variant="secondary">
                  Spectate
                </Button>
              </Link>
            </>
          ) : (
            <Link href={href}>
              <Button size="sm">
                {activity.kind === "tic_tac_toe" || activity.kind === "hangman"
                  ? "Watch"
                  : activity.action === "spin_result"
                    ? "View"
                    : "Open"}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
