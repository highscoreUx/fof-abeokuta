"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { EventUserRow } from "@/types/users";

interface UserRowActionsMenuProps {
  user: EventUserRow;
  busy?: boolean;
  canCheckIn: boolean;
  canViewDetails: boolean;
  canChangeRole: boolean;
  onCheckIn: () => void;
  onDetails: () => void;
  onChangeRole: () => void;
}

export function UserRowActionsMenu({
  user,
  busy = false,
  canCheckIn,
  canViewDetails,
  canChangeRole,
  onCheckIn,
  onDetails,
  onChangeRole,
}: UserRowActionsMenuProps) {
  if (!canCheckIn && !canViewDetails && !canChangeRole) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <DropdownMenu
      align="end"
      trigger={
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 px-0"
          disabled={busy}
          aria-label={`Actions for ${user.firstName} ${user.lastName}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </Button>
      }
    >
      {canCheckIn && (
        <DropdownMenuItem onClick={onCheckIn}>
          {user.checkedInAt ? "Undo check-in" : "Check in"}
        </DropdownMenuItem>
      )}
      {canViewDetails && <DropdownMenuItem onClick={onDetails}>Details</DropdownMenuItem>}
      {canChangeRole && <DropdownMenuItem onClick={onChangeRole}>Change role</DropdownMenuItem>}
    </DropdownMenu>
  );
}
