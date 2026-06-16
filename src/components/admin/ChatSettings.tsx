"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";

export function ChatSettings({ teamingEnabled = true }: { teamingEnabled?: boolean }) {
  const { slug, api } = useEventApi();
  const [teamChatEnabled, setTeamChatEnabled] = useState(true);
  const [chatSocialGamesEnabled, setChatSocialGamesEnabled] = useState(true);
  const [chatSocialGamesDmEnabled, setChatSocialGamesDmEnabled] = useState(true);
  const [chatSocialGamesTeamEnabled, setChatSocialGamesTeamEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<{
      teamChatEnabled: boolean;
      chatSocialGamesEnabled?: boolean;
      chatSocialGamesDmEnabled?: boolean;
      chatSocialGamesTeamEnabled?: boolean;
    }>("/settings")
      .then((data) => {
        setTeamChatEnabled(data.teamChatEnabled ?? true);
        setChatSocialGamesEnabled(data.chatSocialGamesEnabled ?? true);
        setChatSocialGamesDmEnabled(data.chatSocialGamesDmEnabled ?? true);
        setChatSocialGamesTeamEnabled(data.chatSocialGamesTeamEnabled ?? true);
      })
      .catch(() => setTeamChatEnabled(true))
      .finally(() => setLoading(false));
  }, [api, slug]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          teamChatEnabled,
          chatSocialGamesEnabled,
          chatSocialGamesDmEnabled,
          chatSocialGamesTeamEnabled,
        }),
      });
      toastSuccess("Chat settings saved");
    } catch (err) {
      toastError(
        "Failed to save chat settings",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
        <CardDescription>
          Control which group chats participants can use. Polls and direct messages are always
          available in General and private chats.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {teamingEnabled ? (
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition",
              !loading && "hover:bg-muted/40",
              loading && "opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={teamChatEnabled}
              disabled={loading || saving}
              onChange={(e) => setTeamChatEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                Allow participants team chat
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                When off, team channels are hidden from chat for everyone and team messages cannot be
                sent.
              </span>
            </span>
          </label>
        ) : (
          <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Team chat is unavailable because teaming is disabled for this event.
          </p>
        )}

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition",
            !loading && "hover:bg-muted/40",
            loading && "opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={chatSocialGamesEnabled}
            disabled={loading || saving}
            onChange={(e) => setChatSocialGamesEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              Allow casual chat games
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              When off, participants cannot start games from direct messages or team chats.
              Official event activities are not affected.
            </span>
          </span>
        </label>

        {chatSocialGamesEnabled && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={chatSocialGamesDmEnabled}
                disabled={loading || saving}
                onChange={(e) => setChatSocialGamesDmEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary"
              />
              <span className="text-sm text-foreground">Direct message games (e.g. 1v1 X and O)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={chatSocialGamesTeamEnabled}
                disabled={loading || saving}
                onChange={(e) => setChatSocialGamesTeamEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary"
              />
              <span className="text-sm text-foreground">Team chat games</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={loading || saving}>
            {saving ? "Saving…" : "Save chat settings"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
