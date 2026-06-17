"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  DEFAULT_SOCIAL_LUDO_SETTINGS,
  type SocialLudoSettings,
} from "@/lib/chat-game-ludo-settings";
import type { SocialLudoSessionState } from "@/lib/chat-game-ludo-types";
import { toastError, toastSuccess } from "@/lib/toast";

interface ChatGameLudoHostSettingsProps {
  sessionId: string;
  socialLudo?: SocialLudoSessionState;
  lockedFormat?: boolean;
}

export function ChatGameLudoHostSettings({
  sessionId,
  socialLudo,
  lockedFormat = false,
}: ChatGameLudoHostSettingsProps) {
  const { api } = useEventApi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SocialLudoSettings>(
    socialLudo?.settings ?? DEFAULT_SOCIAL_LUDO_SETTINGS,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (socialLudo?.settings) setDraft(socialLudo.settings);
  }, [socialLudo?.settings]);

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
        title="Ludo host settings"
        description="Configure animations and turn timer for this match."
        className="max-w-md"
      >
        <div className="space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={draft.showAnimations}
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({ ...current, showAnimations: event.target.checked }))
              }
            />
            <span>
              Show move animations
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Seeds move one square at a time. When off, they jump straight to the destination.
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
              <span className="text-sm text-muted-foreground">seconds per turn</span>
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
