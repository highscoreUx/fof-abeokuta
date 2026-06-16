"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  DEFAULT_SOCIAL_TTT_SETTINGS,
  type SocialTttSettings,
} from "@/lib/chat-game-ttt-settings";
import type { SocialTttSessionState } from "@/lib/chat-game-ttt-types";
import { toastError, toastSuccess } from "@/lib/toast";

interface ChatGameTttHostSettingsProps {
  sessionId: string;
  socialTtt?: SocialTttSessionState;
  playerXName?: string;
  playerOName?: string;
  /** When true, format/race options are locked (match already started). */
  lockedFormat?: boolean;
}

export function ChatGameTttHostSettings({
  sessionId,
  socialTtt,
  playerXName = "X",
  playerOName = "O",
  lockedFormat = false,
}: ChatGameTttHostSettingsProps) {
  const { api } = useEventApi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SocialTttSettings>(
    socialTtt?.settings ?? DEFAULT_SOCIAL_TTT_SETTINGS,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (socialTtt?.settings) setDraft(socialTtt.settings);
  }, [socialTtt?.settings]);

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
        title="Host settings"
        description={
          lockedFormat
            ? "Adjust turn timer and draw rules during play. Format is locked for this series."
            : "Configure the match before both players are in and the game starts."
        }
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Format
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={draft.seriesMode === "single" ? "primary" : "outline"}
                disabled={busy || lockedFormat}
                onClick={() => setDraft((current) => ({ ...current, seriesMode: "single" }))}
              >
                Single game
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.seriesMode === "race" ? "primary" : "outline"}
                disabled={busy || lockedFormat}
                onClick={() => setDraft((current) => ({ ...current, seriesMode: "race" }))}
              >
                Race
              </Button>
            </div>
            {lockedFormat && (
              <p className="mt-2 text-xs text-muted-foreground">
                Single game vs race cannot be changed mid-match.
              </p>
            )}
            {draft.seriesMode === "race" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">First to</span>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  className="w-20"
                  value={draft.raceTarget}
                  disabled={busy || lockedFormat}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      raceTarget: Number(event.target.value) || 1,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">wins</span>
              </div>
            )}
          </div>

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
                min={5}
                max={300}
                className="w-24"
                value={draft.turnTimerSeconds}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    turnTimerSeconds: Number(event.target.value) || 30,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">seconds per turn</span>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.endOnDraw}
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endOnDraw: event.target.checked }))
              }
            />
            End on draw
          </label>
          {!draft.endOnDraw && (
            <p className="text-xs text-muted-foreground">
              If unchecked, a full board with no winner clears and the other player opens the next
              round.
            </p>
          )}

          {(socialTtt?.score.x ?? 0) > 0 || (socialTtt?.score.o ?? 0) > 0 ? (
            <p className="text-sm text-muted-foreground">
              Score: {playerXName} {socialTtt?.score.x ?? 0} – {socialTtt?.score.o ?? 0}{" "}
              {playerOName}
            </p>
          ) : null}

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
