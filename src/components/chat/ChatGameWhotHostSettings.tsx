"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  DEFAULT_SOCIAL_WHOT_SETTINGS,
  type SocialWhotSettings,
} from "@/lib/chat-game-whot-settings";
import type { SocialWhotSessionState } from "@/lib/chat-game-whot-types";
import { toastError, toastSuccess } from "@/lib/toast";

interface ChatGameWhotHostSettingsProps {
  sessionId: string;
  socialWhot?: SocialWhotSessionState;
  lockedFormat?: boolean;
}

export function ChatGameWhotHostSettings({
  sessionId,
  socialWhot,
  lockedFormat = false,
}: ChatGameWhotHostSettingsProps) {
  const { api } = useEventApi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SocialWhotSettings>(
    socialWhot?.settings ?? DEFAULT_SOCIAL_WHOT_SETTINGS,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (socialWhot?.settings) setDraft(socialWhot.settings);
  }, [socialWhot?.settings]);

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
        title="Whot host settings"
        description="Deal size, last-card calls, and turn timer."
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Cards per player</label>
            <Input
              type="number"
              min={3}
              max={6}
              className="w-24"
              value={draft.cardsPerPlayer}
              disabled={busy || lockedFormat}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cardsPerPlayer: Number(event.target.value) || 6,
                }))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Nigerian Whot is usually dealt 3–6 cards. Applies on the next new game.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={draft.enforceLastCardCall}
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  enforceLastCardCall: event.target.checked,
                }))
              }
            />
            <span>
              Enforce &quot;last card&quot; calls
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Players must call semi (2 cards) and last (1 card) or draw a penalty.
              </span>
            </span>
          </label>

          {draft.enforceLastCardCall && (
            <div className="flex items-center gap-2 pl-6">
              <Input
                type="number"
                min={1}
                max={5}
                className="w-20"
                value={draft.lastCardPenaltyCards}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    lastCardPenaltyCards: Number(event.target.value) || 2,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">penalty cards if forgotten</span>
            </div>
          )}

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
                    turnTimerSeconds: Number(event.target.value) || 45,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">seconds per turn</span>
            </div>
          )}

          {lockedFormat && (
            <p className="text-xs text-muted-foreground">
              Timer and call rules apply immediately. Deal size applies on rematch.
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
