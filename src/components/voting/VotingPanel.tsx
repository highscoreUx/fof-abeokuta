"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

interface Vote {
  id: string;
  title: string;
  open: boolean;
  config: { options: string[]; maxVotes: number };
}

export function VotingPanel({ admin = false }: { admin?: boolean }) {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newOptions, setNewOptions] = useState("Option A, Option B, Option C");

  const load = () => api<{ votes: Vote[] }>("/votes").then((d) => setVotes(d.votes));

  useEffect(() => {
    load();
  }, [slug]);

  useEffect(() => {
    if (!socket) return;
    socket.on("vote:state", (vote: Vote) => {
      setVotes((prev) => {
        const idx = prev.findIndex((v) => v.id === vote.id);
        if (idx === -1) return [vote, ...prev];
        const next = [...prev];
        next[idx] = vote;
        return next;
      });
    });
    return () => {
      socket.off("vote:state");
    };
  }, [socket]);

  const createVote = async () => {
    await api("/votes", {
      method: "POST",
      body: JSON.stringify({
        title: newTitle,
        config: { options: newOptions.split(",").map((o) => o.trim()), maxVotes: 1 },
      }),
    });
    setNewTitle("");
    load();
  };

  const toggleVote = async (id: string, open: boolean) => {
    await api("/votes", { method: "PATCH", body: JSON.stringify({ id, open }) });
    if (open) socket?.emit("vote:admin:open", id);
    load();
  };

  const castBallot = async (voteId: string, selection: string) => {
    await api(`/votes/${voteId}/ballot`, {
      method: "POST",
      body: JSON.stringify({ selections: [selection] }),
    });
  };

  return (
    <div className="space-y-4">
      {admin && (
        <Card>
          <CardTitle>Create Vote</CardTitle>
          <div className="mt-4 space-y-2">
            <input
              className="w-full rounded-lg border border-border px-4 py-2"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Vote title"
            />
            <input
              className="w-full rounded-lg border border-border px-4 py-2"
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="Comma-separated options"
            />
            <Button onClick={createVote}>Create</Button>
          </div>
        </Card>
      )}

      {votes.map((vote) => (
        <Card key={vote.id}>
          <div className="flex items-center justify-between">
            <CardTitle>{vote.title}</CardTitle>
            {admin && (
              <Button
                size="sm"
                variant={vote.open ? "danger" : "primary"}
                onClick={() => toggleVote(vote.id, !vote.open)}
              >
                {vote.open ? "Close" : "Open"}
              </Button>
            )}
          </div>
          {vote.open && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {vote.config.options.map((option) => (
                <Button
                  key={option}
                  variant="secondary"
                  onClick={() => castBallot(vote.id, option)}
                  disabled={admin}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
