"use client";

import { useMemo } from "react";
import { parseChatContent } from "@/lib/chat-content";
import { countUnseenMentionsForRoom } from "@/lib/chat-mentions";
import {
  EMPTY_CHAT_MESSAGES,
  EMPTY_SEEN_MENTION_IDS,
  useChatStore,
} from "@/stores/chatStore";

export function useUnseenMentionCount(
  roomId: string,
  username: string | undefined,
  isPrivate: boolean,
): number {
  const messages = useChatStore((state) => state.messagesByRoom[roomId] ?? EMPTY_CHAT_MESSAGES);
  const seenMentionIds = useChatStore(
    (state) => state.seenMentionIdsByRoom[roomId] ?? EMPTY_SEEN_MENTION_IDS,
  );

  return useMemo(() => {
    if (!username || isPrivate) return 0;
    return countUnseenMentionsForRoom(
      messages,
      username,
      seenMentionIds,
      (body) => parseChatContent(body),
    );
  }, [isPrivate, messages, seenMentionIds, username]);
}
