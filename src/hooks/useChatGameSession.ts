"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { useSocket } from "@/hooks/useSocket";
import { parseChatGameMessageBody, isTerminalChatGameStatus } from "@/lib/chat-game-types";
import type { ChatGameSessionSnapshot } from "@/lib/chat-game-types";
import type { ChatMessage } from "@/types/chat";

export function useChatGameSession(sessionId: string) {
  const { api } = useEventApi();
  const socket = useSocket();
  const [session, setSession] = useState<ChatGameSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const joinedSessionId = useRef<string | null>(null);
  const messageIdRef = useRef<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api<{ session: ChatGameSessionSnapshot }>(
        `/chat-games/${encodeURIComponent(sessionId)}`,
      );
      setSession(data.session);
      messageIdRef.current = data.session.messageId;
      return data.session;
    } catch {
      setSession(null);
      messageIdRef.current = null;
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, sessionId]);

  const joinSession = useCallback(() => {
    if (!socket || !sessionId) return;
    joinedSessionId.current = sessionId;
    socket.emit("chat:game:join", sessionId);
  }, [socket, sessionId]);

  useEffect(() => {
    setLoading(true);
    joinedSessionId.current = null;
    void fetchSession();
  }, [fetchSession, sessionId]);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: ChatGameSessionSnapshot) => {
      if (snapshot.sessionId !== sessionId) return;
      setSession(snapshot);
      messageIdRef.current = snapshot.messageId;
    };

    const onConnect = () => {
      joinedSessionId.current = null;
      joinSession();
      void fetchSession();
    };

    const onMessageUpdate = (message: ChatMessage) => {
      if (!messageIdRef.current || message.id !== messageIdRef.current) return;
      const body = parseChatGameMessageBody(message.body);
      if (!body || body.sessionId !== sessionId) return;
      if (!isTerminalChatGameStatus(body.status)) return;
      void fetchSession();
    };

    socket.on("chat:game:state", onState);
    socket.on("connect", onConnect);
    socket.on("poll:update", onMessageUpdate);
    socket.on("dm:message", onMessageUpdate);

    return () => {
      socket.off("chat:game:state", onState);
      socket.off("connect", onConnect);
      socket.off("poll:update", onMessageUpdate);
      socket.off("dm:message", onMessageUpdate);
    };
  }, [socket, sessionId, joinSession, fetchSession]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    if (joinedSessionId.current === sessionId) return;
    joinSession();
  }, [socket, sessionId, joinSession]);

  return { session, loading, refreshSession: fetchSession };
}
