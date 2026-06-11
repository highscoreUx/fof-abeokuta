"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSocket, isSocketConnected, useSocket } from "@/hooks/useSocket";
import {
  CHAT_TYPING_EVENT,
  type ChatTyper,
  type ChatTypingEmitPayload,
  type ChatTypingPayload,
  TYPING_EMIT_DEBOUNCE_MS,
  TYPING_STOP_IDLE_MS,
  TYPING_TTL_MS,
} from "@/lib/chat-typing";

function emitTyping(payload: ChatTypingEmitPayload) {
  const socket = getSocket();
  if (!socket || !isSocketConnected()) return;
  socket.emit(CHAT_TYPING_EVENT, payload);
}

export function useChatTyping(roomId: string, isActive: boolean, draft: string) {
  const { user } = useAuth();
  const socket = useSocket();
  const [typers, setTypers] = useState<ChatTyper[]>([]);
  const typerTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const idleStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const removeTyper = useCallback((userId: string) => {
    const timeout = typerTimeoutsRef.current.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      typerTimeoutsRef.current.delete(userId);
    }
    setTypers((current) => current.filter((typer) => typer.userId !== userId));
  }, []);

  const handleIncomingTyping = useCallback(
    (payload: ChatTypingPayload) => {
      if (payload.roomId !== roomId) return;
      if (payload.userId === user?.id) return;

      if (!payload.isTyping) {
        removeTyper(payload.userId);
        return;
      }

      setTypers((current) => {
        const existing = current.find((typer) => typer.userId === payload.userId);
        if (
          existing &&
          existing.firstName === payload.firstName &&
          existing.lastName === payload.lastName
        ) {
          return current;
        }
        return [
          ...current.filter((typer) => typer.userId !== payload.userId),
          {
            userId: payload.userId,
            firstName: payload.firstName,
            lastName: payload.lastName,
          },
        ];
      });

      const existingTimeout = typerTimeoutsRef.current.get(payload.userId);
      if (existingTimeout) clearTimeout(existingTimeout);

      typerTimeoutsRef.current.set(
        payload.userId,
        setTimeout(() => removeTyper(payload.userId), TYPING_TTL_MS),
      );
    },
    [removeTyper, roomId, user?.id],
  );

  useEffect(() => {
    const instance = getSocket() ?? socket;
    if (!instance || !isActive) {
      setTypers([]);
      return;
    }

    instance.on(CHAT_TYPING_EVENT, handleIncomingTyping);
    return () => {
      instance.off(CHAT_TYPING_EVENT, handleIncomingTyping);
      for (const timeout of typerTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      typerTimeoutsRef.current.clear();
      setTypers([]);
    };
  }, [handleIncomingTyping, isActive, socket]);

  const stopTyping = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (idleStopRef.current) {
      clearTimeout(idleStopRef.current);
      idleStopRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping({ roomId, isTyping: false });
    }
  }, [roomId]);

  useEffect(() => {
    if (!isActive) {
      stopTyping();
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      stopTyping();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      isTypingRef.current = true;
      emitTyping({ roomId, isTyping: true });
    }, TYPING_EMIT_DEBOUNCE_MS);

    if (idleStopRef.current) clearTimeout(idleStopRef.current);
    idleStopRef.current = setTimeout(() => {
      idleStopRef.current = null;
      stopTyping();
    }, TYPING_STOP_IDLE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (idleStopRef.current) {
        clearTimeout(idleStopRef.current);
        idleStopRef.current = null;
      }
    };
  }, [draft, isActive, roomId, stopTyping]);

  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        emitTyping({ roomId, isTyping: false });
        isTypingRef.current = false;
      }
    };
  }, [roomId]);

  return typers;
}
