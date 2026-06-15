"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ACTIVITY_CATALOG,
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_TIC_TAC_TOE,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
  type ActivitySlug,
} from "@/lib/activities/catalog";
import { parseDurationInput } from "@/lib/countdown/format";
import type { TicTacToeMode } from "@/lib/tic-tac-toe/types";
import type { HangmanMode } from "@/lib/hangman/types";
import type { ActivityCompetitionFormat } from "@/lib/activity-bracket/types";
import type { SpinnerParticipationMode } from "@/lib/spinner/types";
import type { Permission } from "@/lib/permissions/catalog";
import { hasPermission } from "@/lib/permissions";
import { toastError } from "@/lib/toast";

interface EventActivityConfig {
  slug: ActivitySlug | string;
  name: string;
  enabled: boolean;
  allowGeneral: boolean;
  allowGroup: boolean;
}

interface AddActivityModalProps {
  open: boolean;
  onClose: () => void;
  permissions: Permission[];
  eventActivities: EventActivityConfig[];
  onCreate: (data: {
    type: ActivitySlug;
    title: string;
    allowGeneralParticipants: boolean;
    allowGroupParticipants: boolean;
    participationMode?: SpinnerParticipationMode;
    ticTacToeMode?: TicTacToeMode;
    hangmanMode?: HangmanMode;
    competitionFormat?: ActivityCompetitionFormat;
    targetWins?: number;
    durationSec?: number;
  }) => Promise<void>;
  teamingEnabled?: boolean;
}

export function AddActivityModal({
  open,
  onClose,
  permissions,
  eventActivities,
  onCreate,
  teamingEnabled = true,
}: AddActivityModalProps) {
  const creatableTypes = ACTIVITY_CATALOG.filter((entry) => {
    const eventRow = eventActivities.find((a) => a.slug === entry.slug);
    if (!eventRow?.enabled) return false;
    return hasPermission(permissions, entry.managePermission);
  });

  const [type, setType] = useState<ActivitySlug>(ACTIVITY_KAHOOT);
  const [title, setTitle] = useState("");
  const [allowGeneral, setAllowGeneral] = useState(true);
  const [allowGroup, setAllowGroup] = useState(false);
  const [participationMode, setParticipationMode] =
    useState<SpinnerParticipationMode>("ONE_AT_A_TIME");
  const [ticTacToeMode, setTicTacToeMode] = useState<TicTacToeMode>("CHAMPION");
  const [hangmanMode, setHangmanMode] = useState<HangmanMode>("CHAMPION");
  const [competitionFormat, setCompetitionFormat] =
    useState<ActivityCompetitionFormat>("SINGLE_MATCH");
  const [targetWins, setTargetWins] = useState(3);
  const [durationInput, setDurationInput] = useState("5:00");
  const [saving, setSaving] = useState(false);

  const selectedConfig = eventActivities.find((a) => a.slug === type);
  const selectedType = creatableTypes.find((entry) => entry.slug === type);

  useEffect(() => {
    if (!open) return;
    const first = creatableTypes[0]?.slug ?? ACTIVITY_KAHOOT;
    setType(first);
    setTitle("");
    setDurationInput("5:00");
    setCompetitionFormat("SINGLE_MATCH");
    setTargetWins(3);
    const cfg = eventActivities.find((a) => a.slug === first);
    setAllowGeneral(cfg?.allowGeneral ?? true);
    setAllowGroup(Boolean(cfg?.allowGroup && !cfg?.allowGeneral));
  }, [open]);

  useEffect(() => {
    if (!selectedConfig) return;
    if (type === ACTIVITY_KAHOOT || type === ACTIVITY_COUNTDOWN) {
      setAllowGeneral(true);
      setAllowGroup(false);
      return;
    }
    if (!selectedConfig.allowGeneral && allowGeneral) setAllowGeneral(false);
    if (!selectedConfig.allowGroup && allowGroup) setAllowGroup(false);
    if (selectedConfig.allowGeneral && !selectedConfig.allowGroup) setAllowGeneral(true);
    if (selectedConfig.allowGroup && !selectedConfig.allowGeneral) setAllowGroup(true);
  }, [type, selectedConfig, allowGeneral, allowGroup]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toastError("Missing title", "Enter a title for this activity.");
      return;
    }
    if (!allowGeneral && !allowGroup) {
      toastError("Missing scope", "Select at least one participant scope.");
      return;
    }

    setSaving(true);
    try {
      let durationSec: number | undefined;
      if (type === ACTIVITY_COUNTDOWN) {
        const parsed = parseDurationInput(durationInput);
        if (parsed == null) {
          toastError("Invalid duration", "Use M:SS or total seconds (e.g. 5:00 or 300).");
          setSaving(false);
          return;
        }
        durationSec = parsed;
      }

      await onCreate({
        type,
        title: title.trim(),
        allowGeneralParticipants: type === ACTIVITY_KAHOOT || type === ACTIVITY_COUNTDOWN ? true : allowGeneral,
        allowGroupParticipants: type === ACTIVITY_KAHOOT || type === ACTIVITY_COUNTDOWN ? false : allowGroup,
        participationMode: type === ACTIVITY_SPINNER ? participationMode : undefined,
        ticTacToeMode: type === ACTIVITY_TIC_TAC_TOE ? ticTacToeMode : undefined,
        hangmanMode: type === ACTIVITY_HANGMAN ? hangmanMode : undefined,
        competitionFormat:
          type === ACTIVITY_TIC_TAC_TOE || type === ACTIVITY_HANGMAN
            ? competitionFormat
            : undefined,
        targetWins:
          type === ACTIVITY_TIC_TAC_TOE || type === ACTIVITY_HANGMAN
            ? targetWins
            : undefined,
        durationSec,
      });
      onClose();
    } catch (e) {
      toastError(
        "Failed to create activity",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  if (creatableTypes.length === 0) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add activity"
      description="Create a new activity instance for this event."
    >
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="activity-title">
            Title
          </label>
          <Input
            id="activity-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Round 1 — Design sprint"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="activity-type">
            Activity type
          </label>
          <Select
            id="activity-type"
            className="w-full"
            value={type}
            onChange={(e) => setType(e.target.value as ActivitySlug)}
          >
            {creatableTypes.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </Select>
          {selectedType?.description && (
            <p className="mt-2 text-sm text-muted-foreground">{selectedType.description}</p>
          )}
        </div>

        {type === ACTIVITY_KAHOOT ? (
          <p className="text-sm text-muted-foreground">
            Live Trivia is always whole-event scope. When started, it is announced in general and
            team chats so everyone can join or spectate.
          </p>
        ) : type === ACTIVITY_COUNTDOWN ? (
          <p className="text-sm text-muted-foreground">
            Countdown timers are whole-event scope. When started, everyone sees the same synced timer
            on Activities and the main stage.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Who can participate?</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {selectedConfig?.allowGeneral && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowGeneral}
                    onChange={(e) => setAllowGeneral(e.target.checked)}
                  />
                  Whole event
                </label>
              )}
              {teamingEnabled && selectedConfig?.allowGroup && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowGroup}
                    onChange={(e) => setAllowGroup(e.target.checked)}
                  />
                  Team scoped
                </label>
              )}
            </div>
            {teamingEnabled && allowGroup && (
              <p className="text-xs text-muted-foreground">
                Team-scoped spinners post to that team&apos;s chat. Members can spectate live spins.
              </p>
            )}
          </div>
        )}

        {type === ACTIVITY_COUNTDOWN && (
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="countdown-duration">
              Duration
            </label>
            <Input
              id="countdown-duration"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="5:00"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Use M:SS (e.g. 5:00) or total seconds (e.g. 300).
            </p>
          </div>
        )}

        {type === ACTIVITY_SPINNER && (
          <div>
            <label className="mb-2 block text-sm font-medium">Participation</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={participationMode}
              onChange={(e) =>
                setParticipationMode(e.target.value as SpinnerParticipationMode)
              }
            >
              <option value="ONE_AT_A_TIME">One person at a time (spectators watch)</option>
              <option value="CONCURRENT">Anyone can spin</option>
            </select>
          </div>
        )}

        {type === ACTIVITY_TIC_TAC_TOE && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Competition format</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={competitionFormat}
                onChange={(e) =>
                  setCompetitionFormat(e.target.value as ActivityCompetitionFormat)
                }
              >
                <option value="SINGLE_MATCH">Single match — pick two teams later</option>
                <option value="CHAMPIONSHIP">Championship — all teams, bracket rounds</option>
              </select>
            </div>
            {competitionFormat === "CHAMPIONSHIP" && (
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="ttt-target-wins">
                  Race to (wins per matchup)
                </label>
                <Input
                  id="ttt-target-wins"
                  type="number"
                  min={1}
                  max={20}
                  value={targetWins}
                  onChange={(e) => setTargetWins(Number(e.target.value) || 1)}
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium">Play mode</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={ticTacToeMode}
                onChange={(e) => setTicTacToeMode(e.target.value as TicTacToeMode)}
              >
                <option value="CHAMPION">Champion — one mover per team</option>
                <option value="COUNCIL">Council — team votes on moves</option>
              </select>
            </div>
          </div>
        )}

        {type === ACTIVITY_HANGMAN && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Competition format</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={competitionFormat}
                onChange={(e) =>
                  setCompetitionFormat(e.target.value as ActivityCompetitionFormat)
                }
              >
                <option value="SINGLE_MATCH">Single match — pick two teams later</option>
                <option value="CHAMPIONSHIP">Championship — all teams, bracket rounds</option>
              </select>
            </div>
            {competitionFormat === "CHAMPIONSHIP" && (
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="hangman-target-wins">
                  Race to (wins per matchup)
                </label>
                <Input
                  id="hangman-target-wins"
                  type="number"
                  min={1}
                  max={20}
                  value={targetWins}
                  onChange={(e) => setTargetWins(Number(e.target.value) || 1)}
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium">Play mode</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={hangmanMode}
                onChange={(e) => setHangmanMode(e.target.value as HangmanMode)}
              >
                <option value="CHAMPION">Champion — one guesser per team</option>
                <option value="COUNCIL">Council — team votes on letters</option>
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                Add words in Configure after creating the activity.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create activity"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
