import type { BracketMatchContext } from "@/lib/activity-bracket/types";
import { formatBracketMatchLabel } from "@/lib/activity-bracket/match-label";

interface BracketMatchSeriesLabelProps {
  bracket?: BracketMatchContext | null;
  className?: string;
}

export function BracketMatchSeriesLabel({
  bracket,
  className = "text-xs font-medium text-primary",
}: BracketMatchSeriesLabelProps) {
  if (!bracket) return null;

  return <p className={className}>{formatBracketMatchLabel(bracket)}</p>;
}
