"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  DEFAULT_SOCIAL_CHESS_SETTINGS,
  type SocialChessSettings,
} from "@/lib/chat-game-chess-settings";
import type { SocialChessSessionState } from "@/lib/chat-game-chess-types";
import { toastError, toastSuccess } from "@/lib/toast";

interface ChatGameChessHostSettingsProps {
  sessionId: string;
  socialChess?: SocialChessSessionState;
  whitePlayerName?: string;
  blackPlayerName?: string;
  lockedFormat?: boolean;
}

export function ChatGameChessHostSettings({
  sessionId,
  socialChess,
  whitePlayerName = "White",
  blackPlayerName = "Black",
  lockedFormat = false,
}: ChatGameChessHostSettingsProps) {
  const { api } = useEventApi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SocialChessSettings>(
    socialChess?.settings ?? DEFAULT_SOCIAL_CHESS_SETTINGS,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (socialChess?.settings) setDraft(socialChess.settings);
  }, [socialChess?.settings]);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/chat-games/${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ action: "update_settings", settings: draft }),
      });
      toastSuccess("Game settings saved");
      setOpen(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Host settings
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Chess host settings"
        description="Configure hints and timers before or during the match."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {whitePlayerName} (White) vs {blackPlayerName} (Black)
          </p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={draft.showLegalMoves}
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({ ...current, showLegalMoves: event.target.checked }))
              }
            />
            <span>
              Show move direction lines
              <span className="mt-0.5 block text-xs text-muted-foreground">
                When a player selects a piece, arrows point to every legal destination square.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.turnTimerEnabled}
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({ ...current, turnTimerEnabled: event.target.checked }))
              }
            />
            Turn timer
          </label>
          {draft.turnTimerEnabled && (
            <div className="flex items-center gap-2 pl-6">
              <Input
                type="number"
                min={15}
                max={600}
                className="w-24"
                value={draft.turnTimerSeconds}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    turnTimerSeconds: Number(event.target.value) || 60,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">seconds per move</span>
            </div>
          )}

          {lockedFormat && (
            <p className="text-xs text-muted-foreground">
              Settings apply immediately for all players in this match.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
