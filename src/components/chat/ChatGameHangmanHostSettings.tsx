"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  DEFAULT_SOCIAL_HANGMAN_SETTINGS,
  formatWordsForTextarea,
  parseWordsFromText,
  type SocialHangmanSettings,
} from "@/lib/chat-game-hangman-settings";
import type { SocialHangmanSessionState } from "@/lib/chat-game-hangman-types";
import { toastError, toastSuccess } from "@/lib/toast";

interface ChatGameHangmanHostSettingsProps {
  sessionId: string;
  socialHangman?: SocialHangmanSessionState;
  playerXName?: string;
  playerOName?: string;
  lockedFormat?: boolean;
}

export function ChatGameHangmanHostSettings({
  sessionId,
  socialHangman,
  playerXName = "X",
  playerOName = "O",
  lockedFormat = false,
}: ChatGameHangmanHostSettingsProps) {
  const { api } = useEventApi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SocialHangmanSettings>(
    socialHangman?.settings ?? DEFAULT_SOCIAL_HANGMAN_SETTINGS,
  );
  const [wordsText, setWordsText] = useState(
    formatWordsForTextarea(socialHangman?.settings.words ?? DEFAULT_SOCIAL_HANGMAN_SETTINGS.words),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (socialHangman?.settings) {
      setDraft(socialHangman.settings);
      setWordsText(formatWordsForTextarea(socialHangman.settings.words));
    }
  }, [socialHangman?.settings]);

  const save = async () => {
    const words = parseWordsFromText(wordsText);
    if (!lockedFormat && words.length === 0) {
      toastError("Add at least one word.");
      return;
    }

    setBusy(true);
    try {
      await api(`/chat-games/${sessionId}`, {
        method: "POST",
        body: JSON.stringify({
          action: "update_settings",
          settings: {
            ...draft,
            words: lockedFormat ? undefined : words,
          },
        }),
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
            ? "Adjust the turn timer during play. Word list and format are locked for this series."
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

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="hangman-max-wrong">
              Wrong guesses allowed
            </label>
            <Input
              id="hangman-max-wrong"
              type="number"
              min={3}
              max={12}
              className="w-24"
              value={draft.maxWrongGuesses}
              disabled={busy || lockedFormat}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  maxWrongGuesses: Number(event.target.value) || 6,
                }))
              }
            />
          </div>

          {!lockedFormat && (
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="hangman-words">
                Word list
              </label>
              <textarea
                id="hangman-words"
                className="min-h-[8rem] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={wordsText}
                disabled={busy}
                placeholder={"FIGMA\nDESIGN\nPIXEL"}
                onChange={(event) => setWordsText(event.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">One word per line. Letters A–Z only.</p>
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

          {(socialHangman?.score.x ?? 0) > 0 || (socialHangman?.score.o ?? 0) > 0 ? (
            <p className="text-sm text-muted-foreground">
              Score: {playerXName} {socialHangman?.score.x ?? 0} – {socialHangman?.score.o ?? 0}{" "}
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
