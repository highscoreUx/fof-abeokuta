import { parseChatContent } from "@/lib/chat-content";

/** Remove pending game messages when the real chat_game message arrives. */
export function clearPendingChatGameMessages(
  messages: Array<{ id: string; body: string }>,
  incomingBody: string,
): string[] {
  const content = parseChatContent(incomingBody);
  if (content.type !== "chat_game" || content.chatGame.sessionId.startsWith("pending-game-")) {
    return [];
  }

  return messages
    .filter((message) => {
      if (!message.id.startsWith("pending-")) return false;
      const pending = parseChatContent(message.body);
      return pending.type === "chat_game";
    })
    .map((message) => message.id);
}
