"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  user: { username: string; firstName: string; lastName: string };
}

export function TeamChat({ teamId }: { teamId: string }) {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    api<{ messages: Message[] }>(`/messages/${teamId}`)
      .then((data) => setMessages(data.messages))
      .catch(() => {});
  }, [teamId, slug]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: Message) => setMessages((prev) => [...prev, msg]);
    socket.on("team:message", handler);
    return () => {
      socket.off("team:message", handler);
    };
  }, [socket]);

  const send = () => {
    if (!text.trim() || !socket) return;
    socket.emit("team:message", text.trim());
    setText("");
  };

  return (
    <Card className="flex h-[500px] flex-col">
      <h3 className="mb-4 font-semibold">Team Chat — Team {user?.teamLetter}</h3>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              {m.user.firstName} {m.user.lastName}
            </p>
            <p>{m.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message your team..."
        />
        <Button onClick={send}>Send</Button>
      </div>
    </Card>
  );
}
